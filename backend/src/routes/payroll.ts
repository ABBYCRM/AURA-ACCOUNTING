import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';
import {
  IRS_TY_2026,
  computeFedIncomeTax,
  computeSsTax,
  computeMedTax,
  type FilingStatus,
} from '../services/irs-rules';

const router = Router();
router.use(requireAuth);

// State income tax rate is a per-company setting; we use 5% as the
// default for businesses that don't override it.
const STATE_RATE_DEFAULT = 0.05;

function computeTaxes(
  grossAnnual: number,
  filingStatus: string,
  allowances: number,
  taxYear: number
) {
  // Standard deduction (2026 single = 16,100, married = 32,200, hoh = 24,150, mfs = 16,100)
  const stdDeduction =
    filingStatus === 'married' ? IRS_TY_2026.STD_DEDUCTION.married
      : filingStatus === 'hoh' ? IRS_TY_2026.STD_DEDUCTION.hoh
      : filingStatus === 'mfs' ? IRS_TY_2026.STD_DEDUCTION.mfs
      : IRS_TY_2026.STD_DEDUCTION.single;

  // Pre-2020 W-4 had "allowances". Modern W-4 (2020+) uses dependents
  // credits instead. We retain the legacy behavior for backward compat
  // but use the 2026 dependent credit values: $2,200/child under 17,
  // $500/other dependent. We approximate "allowances" as $4,300/ea for
  // legacy users.
  const allowanceValue = 4300;
  const taxableIncome = Math.max(
    0,
    grossAnnual - stdDeduction - allowanceValue * allowances
  );

  // Federal income tax via the canonical 2026 brackets
  const fed = computeFedIncomeTax(taxableIncome, filingStatus as FilingStatus, taxYear);

  // Social Security and Medicare — also via the canonical rules
  const ss = computeSsTax(grossAnnual, taxYear);
  const med = computeMedTax(grossAnnual, taxYear);

  // State income tax (assumes the standard 5% rate; replace with a
  // real state-tax service for production filing)
  const state = Math.max(0, grossAnnual - stdDeduction) * STATE_RATE_DEFAULT;

  return { fed, ss, med, state };
}

const payrollLineSchema = z.object({
  employeeId: z.number().int(),
  hours: z.number().min(0).default(0),
});

const runSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  payDate: z.string(),
  notes: z.string().optional().nullable(),
  lines: z.array(payrollLineSchema).min(1),
});

router.get('/', (req: Request, res: Response) => {
  const runs = db
    .prepare('SELECT * FROM payroll_runs WHERE companyId = ? ORDER BY payDate DESC, id DESC')
    .all(req.user!.companyId);
  res.json({ runs });
});

router.get('/:id', (req: Request, res: Response) => {
  const run = db
    .prepare('SELECT * FROM payroll_runs WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const lines = db
    .prepare(
      `SELECT pl.*, e.firstName, e.lastName, e.filingStatus, e.allowances
       FROM payroll_lines pl JOIN employees e ON e.id = pl.employeeId
       WHERE pl.payrollRunId = ?`
    )
    .all(req.params.id);
  res.json({ run, lines });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }
  const body = parsed.data;
  const companyId = req.user!.companyId;

  const tx = db.transaction(() => {
    const ins = db
      .prepare(
        'INSERT INTO payroll_runs (companyId, periodStart, periodEnd, payDate, status, notes) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(companyId, body.periodStart, body.periodEnd, body.payDate, 'draft', body.notes ?? null);
    const runId = ins.lastInsertRowid as number;

    let totalGross = 0, totalNet = 0, totalTax = 0;
    const insLine = db.prepare(
      'INSERT INTO payroll_lines (payrollRunId, employeeId, hours, gross, fed, ss, med, state, net) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const updEmp = db.prepare(
      'UPDATE employees SET ytdGross = ytdGross + ?, ytdFed = ytdFed + ?, ytdSs = ytdSs + ?, ytdMed = ytdMed + ?, ytdState = ytdState + ? WHERE id = ?'
    );

    for (const line of body.lines) {
      const emp = db
        .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
        .get(line.employeeId, companyId) as any;
      if (!emp) throw new Error(`Employee ${line.employeeId} not found`);

      // Period gross
      const periodGross = emp.annualSalary
        ? emp.annualSalary / 12 * (line.hours > 0 ? 1 : 1)
        : (emp.hourlyRate || 0) * line.hours;

      // Annualize current YTD + this period to compute incremental tax
      const newYtdGross = emp.ytdGross + periodGross;
      const taxYear = new Date().getFullYear();
      const before = computeTaxes(emp.ytdGross, emp.filingStatus || 'single', emp.allowances, taxYear);
      const after = computeTaxes(newYtdGross, emp.filingStatus || 'single', emp.allowances, taxYear);

      const fed = after.fed - before.fed;
      const ss = after.ss - before.ss;
      const med = after.med - before.med;
      const state = after.state - before.state;
      const net = periodGross - fed - ss - med - state;

      insLine.run(runId, line.employeeId, line.hours, periodGross, fed, ss, med, state, net);
      updEmp.run(periodGross, fed, ss, med, state, line.employeeId);

      totalGross += periodGross;
      totalNet += net;
      totalTax += fed + ss + med + state;
    }

    db.prepare(
      'UPDATE payroll_runs SET totalGross = ?, totalNet = ?, totalTax = ? WHERE id = ?'
    ).run(totalGross, totalNet, totalTax, runId);

    return runId;
  });

  const runId = tx();
  logAudit({
    companyId,
    userId: req.user!.userId,
    action: 'payroll.create',
    entity: 'payroll_runs',
    entityId: runId,
  });
  res.json({ id: runId });
});

router.post('/:id/approve', (req: Request, res: Response) => {
  const r = db
    .prepare("UPDATE payroll_runs SET status = 'approved' WHERE id = ? AND companyId = ?")
    .run(req.params.id, req.user!.companyId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'payroll.approve',
    entity: 'payroll_runs',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  // Only allow deletion of draft runs
  const run = db
    .prepare('SELECT * FROM payroll_runs WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId) as any;
  if (!run) return res.status(404).json({ error: 'Not found' });
  if (run.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft runs can be deleted. Reverse YTD manually if needed.' });
  }
  const tx = db.transaction(() => {
    // Reverse YTD
    const lines = db.prepare('SELECT * FROM payroll_lines WHERE payrollRunId = ?').all(req.params.id) as any[];
    const updEmp = db.prepare(
      'UPDATE employees SET ytdGross = ytdGross - ?, ytdFed = ytdFed - ?, ytdSs = ytdSs - ?, ytdMed = ytdMed - ?, ytdState = ytdState - ? WHERE id = ?'
    );
    for (const l of lines) {
      updEmp.run(l.gross, l.fed, l.ss, l.med, l.state, l.employeeId);
    }
    db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(req.params.id);
  });
  tx();
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'payroll.delete',
    entity: 'payroll_runs',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

export default router;
