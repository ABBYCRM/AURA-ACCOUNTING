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
// 2024 federal income tax withholding (simplified — for demo)
const FED_BRACKETS = [
    { cap: 11000, rate: 0.10 },
    { cap: 44725, rate: 0.12 },
    { cap: 95375, rate: 0.22 },
    { cap: 182100, rate: 0.24 },
    { cap: 231250, rate: 0.32 },
    { cap: 578125, rate: 0.35 },
    { cap: Infinity, rate: 0.37 },
];
const SS_RATE = 0.062;
const SS_WAGE_BASE_2024 = 168600;
const MED_RATE = 0.0145;
const MED_ADDITIONAL_RATE = 0.009;
const MED_ADDITIONAL_THRESHOLD = 200000;
const STATE_RATE_DEFAULT = 0.05;
function computeTaxes(grossAnnual, filingStatus, allowances, ytdGross, ytdFed) {
    // Standard deduction (2024 single = 14600, married = 29200)
    const stdDeduction = filingStatus === 'married' ? 29200 : 14600;
    const allowanceValue = 4300; // approximate per allowance
    const taxableIncome = Math.max(0, grossAnnual - stdDeduction - allowanceValue * allowances);
    let fedAnnual = 0;
    let remaining = taxableIncome;
    let prevCap = 0;
    for (const b of FED_BRACKETS) {
        const span = Math.min(remaining, b.cap - prevCap);
        if (span <= 0)
            break;
        fedAnnual += span * b.rate;
        remaining -= span;
        prevCap = b.cap;
    }
    // Effective incremental: take annualized-to-period ratio
    const ssWagesBase = Math.min(SS_WAGE_BASE_2024, grossAnnual);
    const ss = ssWagesBase * SS_RATE;
    const med = grossAnnual * MED_RATE + Math.max(0, grossAnnual - MED_ADDITIONAL_THRESHOLD) * MED_ADDITIONAL_RATE;
    const state = Math.max(0, grossAnnual - stdDeduction) * STATE_RATE_DEFAULT;
    return { fed: fedAnnual, ss, med, state };
}
const payrollLineSchema = zod_1.z.object({
    employeeId: zod_1.z.number().int(),
    hours: zod_1.z.number().min(0).default(0),
});
const runSchema = zod_1.z.object({
    periodStart: zod_1.z.string(),
    periodEnd: zod_1.z.string(),
    payDate: zod_1.z.string(),
    notes: zod_1.z.string().optional().nullable(),
    lines: zod_1.z.array(payrollLineSchema).min(1),
});
router.get('/', (req, res) => {
    const runs = db_1.default
        .prepare('SELECT * FROM payroll_runs WHERE companyId = ? ORDER BY payDate DESC, id DESC')
        .all(req.user.companyId);
    res.json({ runs });
});
router.get('/:id', (req, res) => {
    const run = db_1.default
        .prepare('SELECT * FROM payroll_runs WHERE id = ? AND companyId = ?')
        .get(req.params.id, req.user.companyId);
    if (!run)
        return res.status(404).json({ error: 'Not found' });
    const lines = db_1.default
        .prepare(`SELECT pl.*, e.firstName, e.lastName, e.filingStatus, e.allowances
       FROM payroll_lines pl JOIN employees e ON e.id = pl.employeeId
       WHERE pl.payrollRunId = ?`)
        .all(req.params.id);
    res.json({ run, lines });
});
router.post('/', (req, res) => {
    const parsed = runSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const body = parsed.data;
    const companyId = req.user.companyId;
    const tx = db_1.default.transaction(() => {
        const ins = db_1.default
            .prepare('INSERT INTO payroll_runs (companyId, periodStart, periodEnd, payDate, status, notes) VALUES (?, ?, ?, ?, ?, ?)')
            .run(companyId, body.periodStart, body.periodEnd, body.payDate, 'draft', body.notes ?? null);
        const runId = ins.lastInsertRowid;
        let totalGross = 0, totalNet = 0, totalTax = 0;
        const insLine = db_1.default.prepare('INSERT INTO payroll_lines (payrollRunId, employeeId, hours, gross, fed, ss, med, state, net) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const updEmp = db_1.default.prepare('UPDATE employees SET ytdGross = ytdGross + ?, ytdFed = ytdFed + ?, ytdSs = ytdSs + ?, ytdMed = ytdMed + ?, ytdState = ytdState + ? WHERE id = ?');
        for (const line of body.lines) {
            const emp = db_1.default
                .prepare('SELECT * FROM employees WHERE id = ? AND companyId = ?')
                .get(line.employeeId, companyId);
            if (!emp)
                throw new Error(`Employee ${line.employeeId} not found`);
            // Period gross
            const periodGross = emp.annualSalary
                ? emp.annualSalary / 12 * (line.hours > 0 ? 1 : 1)
                : (emp.hourlyRate || 0) * line.hours;
            // Annualize current YTD + this period to compute incremental tax
            const newYtdGross = emp.ytdGross + periodGross;
            const before = computeTaxes(emp.ytdGross, emp.filingStatus || 'single', emp.allowances, emp.ytdGross, emp.ytdFed);
            const after = computeTaxes(newYtdGross, emp.filingStatus || 'single', emp.allowances, newYtdGross, emp.ytdFed);
            const fed = after.fed - before.fed;
            const ss = after.ss - before.ss;
            const med = after.med - before.med;
            const state = after.state - before.state;
            const net = periodGross - fed - ss - med - state;
            insLine.run(runId, line.employeeId, line.hours, periodGross, fed, ss, med, state, net);
            updEmp.run(periodGross, fed, ss, med, state, line.employeeId);
            totalGross += periodGross;
            totalNet += net;
            totalTax += fed + ss + med + state;
        }
        db_1.default.prepare('UPDATE payroll_runs SET totalGross = ?, totalNet = ?, totalTax = ? WHERE id = ?').run(totalGross, totalNet, totalTax, runId);
        return runId;
    });
    const runId = tx();
    (0, db_2.logAudit)({
        companyId,
        userId: req.user.userId,
        action: 'payroll.create',
        entity: 'payroll_runs',
        entityId: runId,
    });
    res.json({ id: runId });
});
router.post('/:id/approve', (req, res) => {
    const r = db_1.default
        .prepare("UPDATE payroll_runs SET status = 'approved' WHERE id = ? AND companyId = ?")
        .run(req.params.id, req.user.companyId);
    if (r.changes === 0)
        return res.status(404).json({ error: 'Not found' });
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'payroll.approve',
        entity: 'payroll_runs',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
    // Only allow deletion of draft runs
    const run = db_1.default
        .prepare('SELECT * FROM payroll_runs WHERE id = ? AND companyId = ?')
        .get(req.params.id, req.user.companyId);
    if (!run)
        return res.status(404).json({ error: 'Not found' });
    if (run.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft runs can be deleted. Reverse YTD manually if needed.' });
    }
    const tx = db_1.default.transaction(() => {
        // Reverse YTD
        const lines = db_1.default.prepare('SELECT * FROM payroll_lines WHERE payrollRunId = ?').all(req.params.id);
        const updEmp = db_1.default.prepare('UPDATE employees SET ytdGross = ytdGross - ?, ytdFed = ytdFed - ?, ytdSs = ytdSs - ?, ytdMed = ytdMed - ?, ytdState = ytdState - ? WHERE id = ?');
        for (const l of lines) {
            updEmp.run(l.gross, l.fed, l.ss, l.med, l.state, l.employeeId);
        }
        db_1.default.prepare('DELETE FROM payroll_runs WHERE id = ?').run(req.params.id);
    });
    tx();
    (0, db_2.logAudit)({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: 'payroll.delete',
        entity: 'payroll_runs',
        entityId: Number(req.params.id),
    });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=payroll.js.map