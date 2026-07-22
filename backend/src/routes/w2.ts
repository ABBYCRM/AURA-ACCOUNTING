import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';
import { generateW2Pdf } from '../services/pdf';

const router = Router();
router.use(requireAuth);

router.get('/', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = db
    .prepare(
      `SELECT w.*, e.firstName, e.lastName, e.ssnLast4, e.address
       FROM w2_records w JOIN employees e ON e.id = w.employeeId
       WHERE w.companyId = ? AND w.taxYear = ?
       ORDER BY e.lastName, e.firstName`
    )
    .all(req.user!.companyId, year);
  res.json({ w2s: rows, year });
});

router.post('/generate/:employeeId/:year', (req: Request, res: Response) => {
  const employeeId = Number(req.params.employeeId);
  const year = Number(req.params.year);
  const emp = db
    .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
    .get(employeeId, req.user!.companyId) as any;
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  const company = db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .get(req.user!.companyId) as any;

  // Use the current YTD as the W-2 numbers for that year (MVP assumption)
  const w2Data = {
    wages: Math.round(emp.ytdGross * 100) / 100,
    fedTax: Math.round(emp.ytdFed * 100) / 100,
    ssWages: Math.min(emp.ytdGross, 168600),
    ssTax: Math.round(emp.ytdSs * 100) / 100,
    medWages: emp.ytdGross,
    medTax: Math.round(emp.ytdMed * 100) / 100,
    stateWages: emp.ytdGross,
    stateTax: Math.round(emp.ytdState * 100) / 100,
  };

  db.prepare(
    `INSERT INTO w2_records
     (companyId, employeeId, taxYear, wages, fedTax, ssWages, ssTax, medWages, medTax, stateWages, stateTax, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
     ON CONFLICT(employeeId, taxYear) DO UPDATE SET
       wages = excluded.wages, fedTax = excluded.fedTax,
       ssWages = excluded.ssWages, ssTax = excluded.ssTax,
       medWages = excluded.medWages, medTax = excluded.medTax,
       stateWages = excluded.stateWages, stateTax = excluded.stateTax`
  ).run(
    req.user!.companyId, employeeId, year,
    w2Data.wages, w2Data.fedTax, w2Data.ssWages, w2Data.ssTax,
    w2Data.medWages, w2Data.medTax, w2Data.stateWages, w2Data.stateTax
  );

  const row = db
    .prepare('SELECT id FROM w2_records WHERE employeeId = ? AND taxYear = ?')
    .get(employeeId, year) as any;
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'w2.generate',
    entity: 'w2_records',
    entityId: row.id,
    details: { year, employeeId },
  });
  res.json({ id: row.id });
});

router.post('/finalize', (req: Request, res: Response) => {
  const body = z.object({ year: z.number().int() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const r = db
    .prepare("UPDATE w2_records SET status = 'final' WHERE companyId = ? AND taxYear = ? AND status = 'draft'")
    .run(req.user!.companyId, body.data.year);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'w2.finalize_all',
    details: { year: body.data.year },
  });
  res.json({ ok: true, finalized: r.changes });
});

router.get('/pdf/:id', (req: Request, res: Response) => {
  const row = db
    .prepare(
      `SELECT w.*, e.firstName, e.lastName, e.ssnLast4, e.address,
              c.name as companyName, c.ein as companyEin, c.address as companyAddress
       FROM w2_records w
       JOIN employees e ON e.id = w.employeeId
       JOIN companies c ON c.id = w.companyId
       WHERE w.id = ? AND w.companyId = ?`
    )
    .get(req.params.id, req.user!.companyId) as any;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="W2-${row.taxYear}-${row.lastName}.pdf"`);
  generateW2Pdf(row, res);
});

export default router;
