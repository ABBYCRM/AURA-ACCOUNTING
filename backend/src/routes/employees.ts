import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

const employeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  ssnLast4: z.string().max(4).optional().nullable(),
  address: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  terminationDate: z.string().optional().nullable(),
  filingStatus: z.enum(['single', 'married', 'hoh']).optional().nullable(),
  allowances: z.number().int().min(0).default(0),
  hourlyRate: z.number().optional().nullable(),
  annualSalary: z.number().optional().nullable(),
});

router.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM employees WHERE companyId = ? ORDER BY lastName, firstName')
    .all(req.user!.companyId);
  res.json({ employees: rows });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ employee: row });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  const e = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO employees
       (companyId, firstName, lastName, ssnLast4, address, hireDate, terminationDate,
        filingStatus, allowances, hourlyRate, annualSalary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.companyId,
      e.firstName,
      e.lastName,
      e.ssnLast4 ?? null,
      e.address ?? null,
      e.hireDate ?? null,
      e.terminationDate ?? null,
      e.filingStatus ?? null,
      e.allowances,
      e.hourlyRate ?? null,
      e.annualSalary ?? null
    );
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'employee.create',
    entity: 'employees',
    entityId: result.lastInsertRowid as number,
  });
  res.json({ id: result.lastInsertRowid });
});

router.patch('/:id', (req: Request, res: Response) => {
  const body = employeeSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const existing = db
    .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(body.data)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user!.companyId);
  db.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'employee.update',
    entity: 'employees',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM employees WHERE id = ? AND companyId = ?')
    .run(req.params.id, req.user!.companyId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'employee.delete',
    entity: 'employees',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

// YTD reset (start of new year)
router.post('/ytd-reset', (req: Request, res: Response) => {
  const year = Number(req.body?.year) || new Date().getFullYear();
  db.prepare(
    `UPDATE employees SET ytdGross = 0, ytdFed = 0, ytdSs = 0, ytdMed = 0, ytdState = 0 WHERE companyId = ?`
  ).run(req.user!.companyId);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'employee.ytd_reset',
    details: { year },
  });
  res.json({ ok: true, year });
});

export default router;
