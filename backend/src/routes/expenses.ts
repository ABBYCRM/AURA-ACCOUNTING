import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

const expenseSchema = z.object({
  vendorName: z.string().min(1),
  category: z.string().default('general'),
  amount: z.number(),
  date: z.string(),
  accountId: z.number().int().optional().nullable(),
  deductible: z.boolean().default(true),
  memo: z.string().optional().nullable(),
});

router.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM expenses WHERE companyId = ? ORDER BY date DESC, id DESC')
    .all(req.user!.companyId);
  res.json({ expenses: rows });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const e = parsed.data;
  const r = db
    .prepare(
      `INSERT INTO expenses
       (companyId, vendorName, category, amount, date, accountId, deductible, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.companyId,
      e.vendorName,
      e.category,
      e.amount,
      e.date,
      e.accountId ?? null,
      e.deductible ? 1 : 0,
      e.memo ?? null
    );
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'expense.create',
    entity: 'expenses',
    entityId: r.lastInsertRowid as number,
  });
  res.json({ id: r.lastInsertRowid });
});

router.patch('/:id', (req: Request, res: Response) => {
  const body = expenseSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(body.data)) {
    if (k === 'deductible') {
      sets.push('deductible = ?');
      vals.push(v ? 1 : 0);
    } else {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user!.companyId);
  db.prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'expense.update',
    entity: 'expenses',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const r = db
    .prepare('DELETE FROM expenses WHERE id = ? AND companyId = ?')
    .run(req.params.id, req.user!.companyId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'expense.delete',
    entity: 'expenses',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

export default router;
