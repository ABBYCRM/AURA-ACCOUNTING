import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

const invoiceSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().nullable(),
  amount: z.number(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
  issueDate: z.string(),
  dueDate: z.string(),
  memo: z.string().optional().nullable(),
});

router.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM invoices WHERE companyId = ? ORDER BY issueDate DESC, id DESC')
    .all(req.user!.companyId);
  res.json({ invoices: rows });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ invoice: row });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const i = parsed.data;
  const r = db
    .prepare(
      `INSERT INTO invoices
       (companyId, customerName, customerEmail, amount, status, issueDate, dueDate, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.companyId,
      i.customerName,
      i.customerEmail ?? null,
      i.amount,
      i.status,
      i.issueDate,
      i.dueDate,
      i.memo ?? null
    );
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'invoice.create',
    entity: 'invoices',
    entityId: r.lastInsertRowid as number,
  });
  res.json({ id: r.lastInsertRowid });
});

router.patch('/:id', (req: Request, res: Response) => {
  const body = invoiceSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(body.data)) {
    if (k === 'status' && v === 'paid') {
      sets.push('paidDate = ?');
      vals.push(new Date().toISOString().slice(0, 10));
    }
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user!.companyId);
  db.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'invoice.update',
    entity: 'invoices',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const r = db
    .prepare('DELETE FROM invoices WHERE id = ? AND companyId = ?')
    .run(req.params.id, req.user!.companyId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'invoice.delete',
    entity: 'invoices',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

export default router;
