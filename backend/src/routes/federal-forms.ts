/**
 * Federal form summary routes (W-3, 1096, 941, 940).
 * All return DRAFT PDFs only — for official filing, the user must e-file
 * or submit the official scannable form via the IRS.
 */
import { Router, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';
import {
  generateW3Pdf,
  generate1096Pdf,
  generate941Worksheet,
  generate940Worksheet,
} from '../services/pdf';

const router = Router();
router.use(requireAuth);

// ── W-3 (Transmittal of Wage and Tax Statements) ────────────────────────
router.get('/w3/:year', (req, res) => {
  const year = Number(req.params.year);
  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(req.user!.companyId) as any;
  const records = db
    .prepare(
      `SELECT w.* FROM w2_records w
       WHERE w.companyId = ? AND w.taxYear = ?
       ORDER BY w.id`
    )
    .all(req.user!.companyId, year) as any[];

  if (records.length === 0) {
    return res.status(404).json({ error: `No W-2 records found for tax year ${year}` });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="W3-DRAFT-${year}-${company?.name?.replace(/\s+/g, '-')}.pdf"`
  );
  generateW3Pdf(records, company, year, res);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'w3.pdf_generated',
    details: { year, count: records.length },
  });
});

// ── 1096 (Annual Summary and Transmittal) ──────────────────────────────
router.get('/1096/:year', (req, res) => {
  const year = Number(req.params.year);
  const formType = (req.query.formType as string) || 'NEC';
  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(req.user!.companyId) as any;
  const records = db
    .prepare(
      `SELECT f.* FROM form1099_records f
       WHERE f.companyId = ? AND f.taxYear = ? AND f.formType = ?
       ORDER BY f.id`
    )
    .all(req.user!.companyId, year, formType) as any[];

  if (records.length === 0) {
    return res.status(404).json({
      error: `No 1099-${formType} records found for tax year ${year}`,
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="1096-DRAFT-${year}-${formType}-${company?.name?.replace(/\s+/g, '-')}.pdf"`
  );
  generate1096Pdf(records, company, year, formType, res);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: '1096.pdf_generated',
    details: { year, formType, count: records.length },
  });
});

// ── 941 (Quarterly Federal Tax Return) worksheet ────────────────────────
router.get('/941/:year/:quarter', (req, res) => {
  const year = Number(req.params.year);
  const quarter = Number(req.params.quarter);
  if (quarter < 1 || quarter > 4) {
    return res.status(400).json({ error: 'Quarter must be 1-4' });
  }
  // Sum payroll_lines whose payDate falls in the quarter
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(gross), 0) as wages,
         COALESCE(SUM(fed), 0) as fedTax,
         COALESCE(SUM(ss), 0) as ssTax,
         COALESCE(SUM(med), 0) as medTax
       FROM payroll_lines pl
       JOIN payroll_runs pr ON pr.id = pl.payrollRunId
       WHERE pr.companyId = ?
         AND pr.payDate BETWEEN ? AND ?`
    )
    .get(
      req.user!.companyId,
      quarterStart.toISOString().slice(0, 10),
      quarterEnd.toISOString().slice(0, 10)
    ) as any;

  // SS wages = sum of min(per-employee-ytd, wage_base) — approximated here
  // by taking the same totals (a real filing requires per-employee breakdown)
  const totals941 = {
    wages: totals.wages || 0,
    fedTax: totals.fedTax || 0,
    ssWages: totals.wages || 0, // approximation
    ssTax: totals.ssTax || 0,
    medWages: totals.wages || 0,
    medTax: totals.medTax || 0,
    additionalMedTax: 0,
  };

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="941-WORKSHEET-Q${quarter}-${year}.pdf"`
  );
  generate941Worksheet(quarter, year, totals941, res);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: '941.worksheet_generated',
    details: { year, quarter },
  });
});

// ── 940 (Annual FUTA) worksheet ─────────────────────────────────────────
router.get('/940/:year', (req, res) => {
  const year = Number(req.params.year);
  // Sum all payroll_lines in the year
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(gross), 0) as wages
       FROM payroll_lines pl
       JOIN payroll_runs pr ON pr.id = pl.payrollRunId
       WHERE pr.companyId = ? AND strftime('%Y', pr.payDate) = ?`
    )
    .get(req.user!.companyId, String(year)) as any;

  // Use 5.4% as the SUI credit if state is paid (user's actual SUI rate
  // is per-employer and would need to come from a settings table; the
  // default 5.4% is the maximum allowable credit and the most common
  // outcome for employers in good standing with their state).
  const totalPayments = totals.wages || 0;
  const stateUnemploymentWages = totalPayments; // approximation
  const stateUnemploymentContributions = totalPayments * 0.027; // 2.7% default SUI
  const totals940 = {
    totalPayments,
    paymentsExemptFromFUTA: 0,
    stateUnemploymentWages,
    stateUnemploymentContributions,
  };

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="940-WORKSHEET-${year}.pdf"`
  );
  generate940Worksheet(year, totals940, res);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: '940.worksheet_generated',
    details: { year },
  });
});

export default router;
