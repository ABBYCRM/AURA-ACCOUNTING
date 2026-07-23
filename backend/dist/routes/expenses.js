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
const expenseSchema = zod_1.z.object({
    vendorName: zod_1.z.string().min(1),
    category: zod_1.z.string().default('general'),
    amount: zod_1.z.number(),
    date: zod_1.z.string(),
    accountId: zod_1.z.number().int().optional().nullable(),
    deductible: zod_1.z.boolean().default(true),
    memo: zod_1.z.string().optional().nullable(),
});
router.get('/', (req, res) => {
    const rows = db_1.default
        .prepare('SELECT * FROM expenses WHERE companyId = ? ORDER BY date DESC, id DESC')
        .all(req.user.companyId);
    res.json({ expenses: rows });
});
router.post('/', (req, res) => {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input' });
    const e = parsed.data;
    const r = db_1.default
        .prepare(`INSERT INTO expenses
       (companyId, vendorName, category, amount, date, accountId, deductible, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.companyId, e.vendorName, e.category, e.amount, e.date, e.accountId ?? null, e.deductible ? 1 : 0, e.memo ?? null);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'expense.create',
        entity: 'expenses',
        entityId: r.lastInsertRowid,
    });
    res.json({ id: r.lastInsertRowid });
});
router.patch('/:id', (req, res) => {
    const body = expenseSchema.partial().safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid input' });
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(body.data)) {
        if (k === 'deductible') {
            sets.push('deductible = ?');
            vals.push(v ? 1 : 0);
        }
        else {
            sets.push(`${k} = ?`);
            vals.push(v);
        }
    }
    if (!sets.length)
        return res.json({ ok: true });
    vals.push(req.params.id, req.user.companyId);
    db_1.default.prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'expense.update',
        entity: 'expenses',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
    const r = db_1.default
        .prepare('DELETE FROM expenses WHERE id = ? AND companyId = ?')
        .run(req.params.id, req.user.companyId);
    if (r.changes === 0)
        return res.status(404).json({ error: 'Not found' });
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'expense.delete',
        entity: 'expenses',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=expenses.js.map