"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
require("./db");
const db_1 = __importDefault(require("./db"));
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const contractors_1 = __importDefault(require("./routes/contractors"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const w2_1 = __importDefault(require("./routes/w2"));
const forms1099_1 = __importDefault(require("./routes/forms1099"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const reports_1 = __importDefault(require("./routes/reports"));
const qbo_1 = __importDefault(require("./routes/qbo"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'aura-accounting',
        version: '0.1.0',
        time: new Date().toISOString(),
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/contractors', contractors_1.default);
app.use('/api/payroll', payroll_1.default);
app.use('/api/w2', w2_1.default);
app.use('/api/1099', forms1099_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/qbo', qbo_1.default);
app.get('/api/team/users', (req, res) => {
    // List users in the same company
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : req.cookies?.auth;
    if (!token)
        return res.status(401).json({ error: 'Not authenticated' });
    const { verifyToken } = require('./middleware/auth');
    const payload = verifyToken(token);
    if (!payload)
        return res.status(401).json({ error: 'Invalid token' });
    const rows = db_1.default
        .prepare('SELECT id, email, name, role, createdAt FROM users WHERE companyId = ? ORDER BY name')
        .all(payload.companyId);
    res.json({ users: rows });
});
// Serve frontend build (Vite output)
const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist));
    app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
else {
    app.get('/', (_req, res) => {
        res.json({
            message: 'AURA Accounting API',
            hint: 'Frontend bundle not present. Run `cd frontend && npm run build`.',
        });
    });
}
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
const PORT = Number(process.env.PORT) || 4000;
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    app.listen(PORT, () => {
        console.log(`[aura-accounting] listening on :${PORT}`);
        console.log(`[aura-accounting] env: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[aura-accounting] db: ${process.env.DATABASE_PATH || 'default'}`);
        if (!process.env.QBO_CLIENT_ID) {
            console.log('[aura-accounting] QBO OAuth not configured (set QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI)');
        }
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map