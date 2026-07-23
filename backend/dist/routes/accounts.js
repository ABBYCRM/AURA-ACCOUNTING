"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const db_2 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const accountSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
    balance: zod_1.z.number().default(0),
});
router.get('/', (req, res) => {
    const rows = db_1.default
        .prepare('SELECT * FROM accounts WHERE companyId = ? ORDER BY code')
        .all(req.user.companyId);
    res.json({ accounts: rows });
});
router.post('/', (req, res) => {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input' });
    const a = parsed.data;
    try {
        const r = db_1.default
            .prepare('INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, ?)')
            .run(req.user.companyId, a.code, a.name, a.type, a.balance);
        (0, db_2.logAudit)({
            companyId: req.user.companyId,
            userId: req.user.userId,
            action: 'account.create',
            entity: 'accounts',
            entityId: r.lastInsertRowid,
        });
        res.json({ id: r.lastInsertRowid });
    }
    catch (e) {
        if (e.message?.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Account code already exists' });
        }
        throw e;
    }
});
router.patch('/:id', (req, res) => {
    const body = accountSchema.partial().safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid input' });
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(body.data)) {
        sets.push(`${k} = ?`);
        vals.push(v);
    }
    if (!sets.length)
        return res.json({ ok: true });
    vals.push(req.params.id, req.user.companyId);
    db_1.default.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'account.update',
        entity: 'accounts',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
    const r = db_1.default
        .prepare('DELETE FROM accounts WHERE id = ? AND companyId = ?')
        .run(req.params.id, req.user.companyId);
    if (r.changes === 0)
        return res.status(404).json({ error: 'Not found' });
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'account.delete',
        entity: 'accounts',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=accounts.js.map