"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
// Use a unique DB for tests
const tmpDb = path_1.default.join(os_1.default.tmpdir(), `aura-test-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long-enough';
process.env.SESSION_SECRET = 'test-session-secret-32-chars-long-ok';
process.env.PORT = '0';
process.env.NODE_ENV = 'test';
const server_1 = __importDefault(require("../server"));
let token;
let employeeId;
let contractorId;
let invoiceId;
let payrollRunId;
(0, vitest_1.describe)('AURA Accounting API', () => {
    (0, vitest_1.it)('health check works', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.ok).toBe(true);
    });
    (0, vitest_1.it)('login with default admin works', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/auth/login')
            .send({ email: 'admin@aura.local', password: 'admin' });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.token).toBeTruthy();
        (0, vitest_1.expect)(res.body.user.email).toBe('admin@aura.local');
        token = res.body.token;
    });
    (0, vitest_1.it)('me returns current user + company', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.user.email).toBe('admin@aura.local');
        (0, vitest_1.expect)(res.body.user.companyName).toBeTruthy();
    });
    (0, vitest_1.it)('creates and lists employees', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/employees')
            .set('Authorization', `Bearer ${token}`)
            .send({
            firstName: 'Test',
            lastName: 'User',
            ssnLast4: '1234',
            hireDate: '2026-01-01',
            filingStatus: 'single',
            allowances: 0,
            annualSalary: 60000,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.id).toBeGreaterThan(0);
        employeeId = res.body.id;
        const list = await (0, supertest_1.default)(server_1.default).get('/api/employees').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(list.status).toBe(200);
        (0, vitest_1.expect)(list.body.employees.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('runs a payroll and updates YTD', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/payroll')
            .set('Authorization', `Bearer ${token}`)
            .send({
            periodStart: '2026-01-01',
            periodEnd: '2026-01-31',
            payDate: '2026-01-31',
            lines: [{ employeeId, hours: 0 }],
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        payrollRunId = res.body.id;
        (0, vitest_1.expect)(payrollRunId).toBeGreaterThan(0);
        const emp = await (0, supertest_1.default)(server_1.default)
            .get(`/api/employees/${employeeId}`)
            .set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(emp.body.employee.ytdGross).toBeGreaterThan(0);
        // ytdFed may be 0 if first month is below standard deduction — assert it is a number
        (0, vitest_1.expect)(typeof emp.body.employee.ytdFed).toBe('number');
        (0, vitest_1.expect)(emp.body.employee.ytdSs).toBeGreaterThan(0);
        (0, vitest_1.expect)(emp.body.employee.ytdMed).toBeGreaterThan(0);
        (0, vitest_1.expect)(typeof emp.body.employee.ytdState).toBe('number');
    });
    (0, vitest_1.it)('generates W-2 PDF', async () => {
        const gen = await (0, supertest_1.default)(server_1.default)
            .post(`/api/w2/generate/${employeeId}/2026`)
            .set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(gen.status).toBe(200);
        const pdf = await (0, supertest_1.default)(server_1.default)
            .get(`/api/w2/pdf/${gen.body.id}`)
            .set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(pdf.status).toBe(200);
        (0, vitest_1.expect)(pdf.headers['content-type']).toContain('application/pdf');
        (0, vitest_1.expect)(pdf.body.length || pdf.body.byteLength || pdf.body).toBeTruthy();
    });
    (0, vitest_1.it)('creates a contractor and an invoice', async () => {
        const c = await (0, supertest_1.default)(server_1.default)
            .post('/api/contractors')
            .set('Authorization', `Bearer ${token}`)
            .send({
            firstName: 'Cont',
            lastName: 'Actor',
            tinLast4: '9999',
            tinType: 'ssn',
            email: 'c@x.com',
        });
        (0, vitest_1.expect)(c.status).toBe(200);
        contractorId = c.body.id;
        const inv = await (0, supertest_1.default)(server_1.default)
            .post('/api/invoices')
            .set('Authorization', `Bearer ${token}`)
            .send({
            customerName: 'Acme Corp',
            amount: 1250,
            status: 'sent',
            issueDate: '2026-02-01',
            dueDate: '2026-03-01',
        });
        (0, vitest_1.expect)(inv.status).toBe(200);
        invoiceId = inv.body.id;
        const i = await (0, supertest_1.default)(server_1.default).get(`/api/invoices/${invoiceId}`).set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(i.body.invoice.amount).toBe(1250);
    });
    (0, vitest_1.it)('logs an expense and shows it in dashboard', async () => {
        const e = await (0, supertest_1.default)(server_1.default)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send({
            vendorName: 'AWS',
            category: 'software',
            amount: 234.56,
            date: '2026-02-15',
            deductible: true,
        });
        (0, vitest_1.expect)(e.status).toBe(200);
        const dash = await (0, supertest_1.default)(server_1.default).get('/api/reports/dashboard').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(dash.body.ytdExpenses).toBeGreaterThan(0);
        (0, vitest_1.expect)(dash.body.employeeCount).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(dash.body.contractorCount).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('chart of accounts is seeded', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/accounts').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(res.body.accounts.length).toBeGreaterThanOrEqual(7);
    });
    (0, vitest_1.it)('monthly report returns 12 months', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/reports/monthly').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(res.body.months.length).toBe(12);
    });
    (0, vitest_1.it)('QBO status returns configured=false when env not set', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/qbo/status').set('Authorization', `Bearer ${token}`);
        (0, vitest_1.expect)(res.body.configured).toBe(false);
        (0, vitest_1.expect)(res.body.connected).toBe(false);
    });
    (0, vitest_1.it)('unauth requests get 401', async () => {
        const res = await (0, supertest_1.default)(server_1.default).get('/api/employees');
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('rejects bad input with 400', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/employees')
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: '' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.afterAll)(() => {
    try {
        fs_1.default.unlinkSync(tmpDb);
    }
    catch { }
    try {
        fs_1.default.unlinkSync(tmpDb + '-shm');
    }
    catch { }
    try {
        fs_1.default.unlinkSync(tmpDb + '-wal');
    }
    catch { }
});
//# sourceMappingURL=basic.test.js.map