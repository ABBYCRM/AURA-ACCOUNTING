import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();
router.use(requireAuth);

const contractorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  businessName: z.string().optional().nullable(),
  tinLast4: z.string().max(4).optional().nullable(),
  tinType: z.enum(['ssn', 'ein']).default('ssn'),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

router.get('/', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM contractors WHERE companyId = ? ORDER BY lastName, firstName')
    .all(req.user!.companyId);
  res.json({ contractors: rows });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM contractors WHERE id = ? AND companyId = ?')
    .get(req.params.id, req.user!.companyId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ contractor: row });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = contractorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const c = parsed.data;
  const r = db
    .prepare(
      `INSERT INTO contractors
       (companyId, firstName, lastName, businessName, tinLast4, tinType, address, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.companyId,
      c.firstName,
      c.lastName,
      c.businessName ?? null,
      c.tinLast4 ?? null,
      c.tinType,
      c.address ?? null,
      c.email ?? null
    );
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'contractor.create',
    entity: 'contractors',
    entityId: r.lastInsertRowid as number,
  });
  res.json({ id: r.lastInsertRowid });
});

router.patch('/:id', (req: Request, res: Response) => {
  const body = contractorSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(body.data)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id, req.user!.companyId);
  db.prepare(`UPDATE contractors SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'contractor.update',
    entity: 'contractors',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const r = db
    .prepare('DELETE FROM contractors WHERE id = ? AND companyId = ?')
    .run(req.params.id, req.user!.companyId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'contractor.delete',
    entity: 'contractors',
    entityId: Number(req.params.id),
  });
  res.json({ ok: true });
});

router.post('/ytd-reset', (req: Request, res: Response) => {
  db.prepare('UPDATE contractors SET ytdPayments = 0 WHERE companyId = ?').run(req.user!.companyId);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'contractor.ytd_reset',
  });
  res.json({ ok: true });
});

export default router;
