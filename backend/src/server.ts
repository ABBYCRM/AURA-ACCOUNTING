import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import './db';
import db from './db';
import authRouter from './routes/auth';
import employeesRouter from './routes/employees';
import contractorsRouter from './routes/contractors';
import payrollRouter from './routes/payroll';
import w2Router from './routes/w2';
import forms1099Router from './routes/forms1099';
import invoicesRouter from './routes/invoices';
import expensesRouter from './routes/expenses';
import accountsRouter from './routes/accounts';
import reportsRouter from './routes/reports';
import qboRouter from './routes/qbo';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'aura-accounting',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/w2', w2Router);
app.use('/api/1099', forms1099Router);
app.use('/api/invoices', invoicesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/qbo', qboRouter);

app.get('/api/team/users', (req, res) => {
  // List users in the same company
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : (req.cookies?.auth as string | undefined);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const { verifyToken } = require('./middleware/auth');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  const rows = db
    .prepare('SELECT id, email, name, role, createdAt FROM users WHERE companyId = ? ORDER BY name')
    .all(payload.companyId);
  res.json({ users: rows });
});

// Serve frontend build (Vite output)
const frontendDist = fs.existsSync(path.join(__dirname, '../../frontend/dist'))
  ? path.join(__dirname, '../../frontend/dist')
  : path.join(__dirname, '../../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      message: 'AURA Accounting API',
      hint: 'Frontend bundle not present. Run `cd frontend && npm run build`.',
    });
  });
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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

export default app;
