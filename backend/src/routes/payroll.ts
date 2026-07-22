import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

// 2024 federal income tax withholding (simplified — for demo)
const FED_BRACKETS: Array<{ cap: number; rate: number }> = [
  { cap: 11000, rate: 0.10 },
  { cap: 44725, rate: 0.12 },
  { cap: 95375, rate: 0.22 },
  { cap: 182100, rate: 0.24 },
  { cap: 231250, rate: 0.32 },
  { cap: 578125, rate: 0.35 },
  { cap: Infinity, rate: 0.37 },
];

const SS_RATE = 0.062;
const SS_WAGE_BASE_2024 = 168600;
const MED_RATE = 0.0145;
const MED_ADDITIONAL_RATE = 0.009;
const MED_ADDITIONAL_THRESHOLD = 200000;
const STATE_RATE_DEFAULT = 0.05;

function computeTaxes(grossAnnual: number, filingStatus: string, allowances: number, ytdGross: number, ytdFed: number) {
  // Standard deduction (2024 single = 14600, married = 29200)
  const stdDeduction = filingStatus === 'married' ? 29200 : 14600;
  const allowanceValue = 4300; // approximate per allowance
  const taxableIncome = Math.max(0, grossAnnual - stdDeduction - allowanceValue * allowances);

  let fedAnnual = 0;
  let remaining = taxableIncome;
  let prevCap = 0;
  for (const b of FED_BRACKETS) {
    const span = Math.min(remaining, b.cap - prevCap);
    if (span <= 0) break;
    fedAnnual += span * b.rate;
    remaining -= span;
    prevCap = b.cap;
  }

  // Effective incremental: take annualized-to-period ratio
  const ssWagesBase = Math.min(SS_WAGE_BASE_2024, grossAnnual);
  const ss = ssWagesBase * SS_RATE;
  const med = grossAnnual * MED_RATE + Math.max(0, grossAnnual - MED_ADDITIONAL_THRESHOLD) * MED_ADDITIONAL_RATE;
  const state = Math.max(0, grossAnnual - stdDeduction) * STATE_RATE_DEFAULT;

  return { fed: fedAnnual, ss, med, state };
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
      const before = computeTaxes(emp.ytdGross, emp.filingStatus || 'single', emp.allowances, emp.ytdGross, emp.ytdFed);
      const after = computeTaxes(newYtdGross, emp.filingStatus || 'single', emp.allowances, newYtdGross, emp.ytdFed);

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
