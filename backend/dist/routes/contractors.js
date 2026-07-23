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
const contractorSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    businessName: zod_1.z.string().optional().nullable(),
    tinLast4: zod_1.z.string().max(4).optional().nullable(),
    tinType: zod_1.z.enum(['ssn', 'ein']).default('ssn'),
    address: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
});
router.get('/', (req, res) => {
    const rows = db_1.default
        .prepare('SELECT * FROM contractors WHERE companyId = ? ORDER BY lastName, firstName')
        .all(req.user.companyId);
    res.json({ contractors: rows });
});
router.get('/:id', (req, res) => {
    const row = db_1.default
        .prepare('SELECT * FROM contractors WHERE id = ? AND companyId = ?')
        .get(req.params.id, req.user.companyId);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    res.json({ contractor: row });
});
router.post('/', (req, res) => {
    const parsed = contractorSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input' });
    const c = parsed.data;
    const r = db_1.default
        .prepare(`INSERT INTO contractors
       (companyId, firstName, lastName, businessName, tinLast4, tinType, address, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.companyId, c.firstName, c.lastName, c.businessName ?? null, c.tinLast4 ?? null, c.tinType, c.address ?? null, c.email ?? null);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'contractor.create',
        entity: 'contractors',
        entityId: r.lastInsertRowid,
    });
    res.json({ id: r.lastInsertRowid });
});
router.patch('/:id', (req, res) => {
    const body = contractorSchema.partial().safeParse(req.body);
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
    db_1.default.prepare(`UPDATE contractors SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'contractor.update',
        entity: 'contractors',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
    const r = db_1.default
        .prepare('DELETE FROM contractors WHERE id = ? AND companyId = ?')
        .run(req.params.id, req.user.companyId);
    if (r.changes === 0)
        return res.status(404).json({ error: 'Not found' });
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'contractor.delete',
        entity: 'contractors',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.post('/ytd-reset', (req, res) => {
    db_1.default.prepare('UPDATE contractors SET ytdPayments = 0 WHERE companyId = ?').run(req.user.companyId);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'contractor.ytd_reset',
    });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=contractors.js.map