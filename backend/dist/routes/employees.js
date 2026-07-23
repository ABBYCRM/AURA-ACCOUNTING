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
const employeeSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    ssnLast4: zod_1.z.string().max(4).optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    hireDate: zod_1.z.string().optional().nullable(),
    terminationDate: zod_1.z.string().optional().nullable(),
    filingStatus: zod_1.z.enum(['single', 'married', 'hoh']).optional().nullable(),
    allowances: zod_1.z.number().int().min(0).default(0),
    hourlyRate: zod_1.z.number().optional().nullable(),
    annualSalary: zod_1.z.number().optional().nullable(),
});
router.get('/', (req, res) => {
    const rows = db_1.default
        .prepare('SELECT * FROM employees WHERE companyId = ? ORDER BY lastName, firstName')
        .all(req.user.companyId);
    res.json({ employees: rows });
});
router.get('/:id', (req, res) => {
    const row = db_1.default
        .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
        .get(req.params.id, req.user.companyId);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    res.json({ employee: row });
});
router.post('/', (req, res) => {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const e = parsed.data;
    const result = db_1.default
        .prepare(`INSERT INTO employees
       (companyId, firstName, lastName, ssnLast4, address, hireDate, terminationDate,
        filingStatus, allowances, hourlyRate, annualSalary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.companyId, e.firstName, e.lastName, e.ssnLast4 ?? null, e.address ?? null, e.hireDate ?? null, e.terminationDate ?? null, e.filingStatus ?? null, e.allowances, e.hourlyRate ?? null, e.annualSalary ?? null);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'employee.create',
        entity: 'employees',
        entityId: result.lastInsertRowid,
    });
    res.json({ id: result.lastInsertRowid });
});
router.patch('/:id', (req, res) => {
    const body = employeeSchema.partial().safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: 'Invalid input' });
    const existing = db_1.default
        .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
        .get(req.params.id, req.user.companyId);
    if (!existing)
        return res.status(404).json({ error: 'Not found' });
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(body.data)) {
        sets.push(`${k} = ?`);
        vals.push(v);
    }
    if (!sets.length)
        return res.json({ ok: true });
    vals.push(req.params.id, req.user.companyId);
    db_1.default.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ? AND companyId = ?`).run(...vals);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'employee.update',
        entity: 'employees',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
    const result = db_1.default
        .prepare('DELETE FROM employees WHERE id = ? AND companyId = ?')
        .run(req.params.id, req.user.companyId);
    if (result.changes === 0)
        return res.status(404).json({ error: 'Not found' });
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'employee.delete',
        entity: 'employees',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
// YTD reset (start of new year)
router.post('/ytd-reset', (req, res) => {
    const year = Number(req.body?.year) || new Date().getFullYear();
    db_1.default.prepare(`UPDATE employees SET ytdGross = 0, ytdFed = 0, ytdSs = 0, ytdMed = 0, ytdState = 0 WHERE companyId = ?`).run(req.user.companyId);
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'employee.ytd_reset',
        details: { year },
    });
    res.json({ ok: true, year });
});
exports.default = router;
//# sourceMappingURL=employees.js.map