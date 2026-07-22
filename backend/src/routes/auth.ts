import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db';
import { signToken, requireAuth } from '../middleware/auth';
import { logAudit } from '../db';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().min(1),
});

router.post('/register', (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
  }
  const { email, password, name, companyName } = parsed.data;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run(companyName);
    const companyId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
    db.prepare(
      'INSERT INTO users (email, passwordHash, name, role, companyId) VALUES (?, ?, ?, ?, ?)'
    ).run(email, passwordHash, name, 'admin', companyId);
    // Default chart of accounts
    const defaults = [
      ['1000', 'Cash', 'asset'],
      ['1100', 'Accounts Receivable', 'asset'],
      ['2000', 'Accounts Payable', 'liability'],
      ['3000', 'Owner Equity', 'equity'],
      ['4000', 'Revenue', 'income'],
      ['5000', 'Cost of Goods Sold', 'expense'],
      ['6000', 'Operating Expenses', 'expense'],
    ];
    const insertAccount = db.prepare(
      'INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, 0)'
    );
    for (const [code, name, type] of defaults) insertAccount.run(companyId, code, name, type);
    logAudit({ companyId, action: 'user.register', entity: 'users', details: { email } });
    return companyId;
  });
  const companyId = tx();
  const userRow = db.prepare('SELECT id, email, name, role, companyId FROM users WHERE email = ?').get(email) as any;
  const token = signToken({ userId: userRow.id, companyId, role: userRow.role });
  res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ token, user: userRow });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { email, password } = parsed.data;
  const row = db.prepare(
    'SELECT id, email, passwordHash, name, role, companyId FROM users WHERE email = ?'
  ).get(email) as any;
  if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken({ userId: row.id, companyId: row.companyId, role: row.role });
  res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  logAudit({ companyId: row.companyId, userId: row.id, action: 'user.login', ip: req.ip });
  res.json({
    token,
    user: { id: row.id, email: row.email, name: row.name, role: row.role, companyId: row.companyId },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.companyId, c.name as companyName, c.ein, c.address, c.fiscalYearEnd
     FROM users u JOIN companies c ON c.id = u.companyId WHERE u.id = ?`
  ).get(userId) as any;
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: row });
});

router.patch('/me', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const companyId = req.user!.companyId;
  const body = z
    .object({
      name: z.string().min(1).optional(),
      companyName: z.string().min(1).optional(),
      ein: z.string().optional(),
      address: z.string().optional(),
      fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const { name, companyName, ein, address, fiscalYearEnd } = body.data;
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
  if (companyName || ein !== undefined || address !== undefined || fiscalYearEnd) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (companyName) { sets.push('name = ?'); vals.push(companyName); }
    if (ein !== undefined) { sets.push('ein = ?'); vals.push(ein); }
    if (address !== undefined) { sets.push('address = ?'); vals.push(address); }
    if (fiscalYearEnd) { sets.push('fiscalYearEnd = ?'); vals.push(fiscalYearEnd); }
    vals.push(companyId);
    db.prepare(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
  logAudit({ companyId, userId, action: 'user.update', entity: 'users', entityId: userId });
  res.json({ ok: true });
});

router.post('/change-password', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = z
    .object({ currentPassword: z.string(), newPassword: z.string().min(8) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const row = db.prepare('SELECT passwordHash FROM users WHERE id = ?').get(userId) as any;
  if (!row || !bcrypt.compareSync(body.data.currentPassword, row.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const newHash = bcrypt.hashSync(body.data.newPassword, 10);
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, userId);
  logAudit({ companyId: req.user!.companyId, userId, action: 'user.password_change' });
  res.json({ ok: true });
});

export default router;
