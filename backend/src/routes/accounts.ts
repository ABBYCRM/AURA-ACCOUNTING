import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  balance: z.number().default(0),
});

router.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM accounts WHERE companyId = ? ORDER BY code')
    .all(req.user!.companyId);
  res.json({ accounts: rows });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const a = parsed.data;
  try {
    const r = db
      .prepare('INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, ?)')
      .run(req.user!.companyId, a.code, a.name, a.type, a.balance);
    logAudit({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      action: 'account.create',
      entity: 'accounts',
      entityId: r.lastInsertRowid as number,
    });
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Account code already exists' });
    }
    throw e;
  }
});

router.patch('/:id', (req: Request, res: Response) => {
  const body = accountSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(body.data)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user!.companyId);
  db.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'account.update',
    entity: 'accounts',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const r = db
    .prepare('DELETE FROM accounts WHERE id = ? AND companyId = ?')
    .run(req.params.id, req.user!.companyId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'account.delete',
    entity: 'accounts',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

export default router;
