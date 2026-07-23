"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const db_2 = require("../db");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(4),
    name: zod_1.z.string().min(1),
    companyName: zod_1.z.string().min(1),
});
router.post('/register', (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { email, password, name, companyName } = parsed.data;
    const existing = db_1.default.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
    }
    const passwordHash = bcryptjs_1.default.hashSync(password, 10);
    const tx = db_1.default.transaction(() => {
        db_1.default.prepare('INSERT INTO companies (name) VALUES (?)').run(companyName);
        const companyId = db_1.default.prepare('SELECT last_insert_rowid() as id').get().id;
        db_1.default.prepare('INSERT INTO users (email, passwordHash, name, role, companyId) VALUES (?, ?, ?, ?, ?)').run(email, passwordHash, name, 'admin', companyId);
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
        const insertAccount = db_1.default.prepare('INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, 0)');
        for (const [code, name, type] of defaults)
            insertAccount.run(companyId, code, name, type);
        (0, db_2.logAudit)({ companyId, action: 'user.register', entity: 'users', details: { email } });
        return companyId;
    });
    const companyId = tx();
    const userRow = db_1.default.prepare('SELECT id, email, name, role, companyId FROM users WHERE email = ?').get(email);
    const token = (0, auth_1.signToken)({ userId: userRow.id, companyId, role: userRow.role });
    res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token, user: userRow });
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
router.post('/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    const { email, password } = parsed.data;
    const row = db_1.default.prepare('SELECT id, email, passwordHash, name, role, companyId FROM users WHERE email = ?').get(email);
    if (!row || !bcryptjs_1.default.compareSync(password, row.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = (0, auth_1.signToken)({ userId: row.id, companyId: row.companyId, role: row.role });
    res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    (0, db_2.logAudit)({ companyId: row.companyId, userId: row.id, action: 'user.login', ip: req.ip });
    res.json({
        token,
        user: { id: row.id, email: row.email, name: row.name, role: row.role, companyId: row.companyId },
    });
});
router.post('/logout', (_req, res) => {
    res.clearCookie('auth');
    res.json({ ok: true });
});
router.get('/me', auth_1.requireAuth, (req, res) => {
    const userId = req.user.userId;
    const row = db_1.default.prepare(`SELECT u.id, u.email, u.name, u.role, u.companyId, c.name as companyName, c.ein, c.address, c.fiscalYearEnd
     FROM users u JOIN companies c ON c.id = u.companyId WHERE u.id = ?`).get(userId);
    if (!row)
        return res.status(404).json({ error: 'User not found' });
    res.json({ user: row });
});
router.patch('/me', auth_1.requireAuth, (req, res) => {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const body = zod_1.z
        .object({
        name: zod_1.z.string().min(1).optional(),
        companyName: zod_1.z.string().min(1).optional(),
        ein: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        fiscalYearEnd: zod_1.z.string().regex(/^\d{2}-\d{2}$/).optional(),
    })
        .safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid input' });
    const { name, companyName, ein, address, fiscalYearEnd } = body.data;
    if (name)
        db_1.default.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
    if (companyName || ein !== undefined || address !== undefined || fiscalYearEnd) {
        const sets = [];
        const vals = [];
        if (companyName) {
            sets.push('name = ?');
            vals.push(companyName);
        }
        if (ein !== undefined) {
            sets.push('ein = ?');
            vals.push(ein);
        }
        if (address !== undefined) {
            sets.push('address = ?');
            vals.push(address);
        }
        if (fiscalYearEnd) {
            sets.push('fiscalYearEnd = ?');
            vals.push(fiscalYearEnd);
        }
        vals.push(companyId);
        db_1.default.prepare(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    (0, db_2.logAudit)({ companyId, userId, action: 'user.update', entity: 'users', entityId: userId });
    res.json({ ok: true });
});
router.post('/change-password', auth_1.requireAuth, (req, res) => {
    const userId = req.user.userId;
    const body = zod_1.z
        .object({ currentPassword: zod_1.z.string(), newPassword: zod_1.z.string().min(4) })
        .safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid input' });
    const row = db_1.default.prepare('SELECT passwordHash FROM users WHERE id = ?').get(userId);
    if (!row || !bcryptjs_1.default.compareSync(body.data.currentPassword, row.passwordHash)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = bcryptjs_1.default.hashSync(body.data.newPassword, 10);
    db_1.default.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, userId);
    (0, db_2.logAudit)({ companyId: req.user.companyId, userId, action: 'user.password_change' });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=auth.js.map