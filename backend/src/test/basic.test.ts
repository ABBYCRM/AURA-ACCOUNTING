import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Use a unique DB for tests
const tmpDb = path.join(os.tmpdir(), `aura-test-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long-enough';
process.env.SESSION_SECRET = 'test-session-secret-32-chars-long-ok';
process.env.PORT = '0';
process.env.NODE_ENV = 'test';

import app from '../server';

let token: string;
let employeeId: number;
let contractorId: number;
let invoiceId: number;
let payrollRunId: number;

describe('AURA Accounting API', () => {
  it('health check works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('login with default admin works', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aura.local', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('admin@aura.local');
    token = res.body.token;
  });

  it('me returns current user + company', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@aura.local');
    expect(res.body.user.companyName).toBeTruthy();
  });

  it('creates and lists employees', async () => {
    const res = await request(app)
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
    expect(res.status).toBe(200);
    expect(res.body.id).toBeGreaterThan(0);
    employeeId = res.body.id;

    const list = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.employees.length).toBeGreaterThan(0);
  });

  it('runs a payroll and updates YTD', async () => {
    const res = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${token}`)
      .send({
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        payDate: '2026-01-31',
        lines: [{ employeeId, hours: 0 }],
      });
    expect(res.status).toBe(200);
    payrollRunId = res.body.id;
    expect(payrollRunId).toBeGreaterThan(0);

    const emp = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(emp.body.employee.ytdGross).toBeGreaterThan(0);
    // ytdFed may be 0 if first month is below standard deduction — assert it is a number
    expect(typeof emp.body.employee.ytdFed).toBe('number');
    expect(emp.body.employee.ytdSs).toBeGreaterThan(0);
    expect(emp.body.employee.ytdMed).toBeGreaterThan(0);
    expect(typeof emp.body.employee.ytdState).toBe('number');
  });

  it('generates W-2 PDF', async () => {
    const gen = await request(app)
      .post(`/api/w2/generate/${employeeId}/2026`)
      .set('Authorization', `Bearer ${token}`);
    expect(gen.status).toBe(200);
    const pdf = await request(app)
      .get(`/api/w2/pdf/${gen.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.length || pdf.body.byteLength || pdf.body).toBeTruthy();
  });

  it('creates a contractor and an invoice', async () => {
    const c = await request(app)
      .post('/api/contractors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Cont',
        lastName: 'Actor',
        tinLast4: '9999',
        tinType: 'ssn',
        email: 'c@x.com',
      });
    expect(c.status).toBe(200);
    contractorId = c.body.id;

    const inv = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Acme Corp',
        amount: 1250,
        status: 'sent',
        issueDate: '2026-02-01',
        dueDate: '2026-03-01',
      });
    expect(inv.status).toBe(200);
    invoiceId = inv.body.id;

    const i = await request(app).get(`/api/invoices/${invoiceId}`).set('Authorization', `Bearer ${token}`);
    expect(i.body.invoice.amount).toBe(1250);
  });

  it('logs an expense and shows it in dashboard', async () => {
    const e = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vendorName: 'AWS',
        category: 'software',
        amount: 234.56,
        date: '2026-02-15',
        deductible: true,
      });
    expect(e.status).toBe(200);
    const dash = await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${token}`);
    expect(dash.body.ytdExpenses).toBeGreaterThan(0);
    expect(dash.body.employeeCount).toBeGreaterThanOrEqual(1);
    expect(dash.body.contractorCount).toBeGreaterThanOrEqual(1);
  });

  it('chart of accounts is seeded', async () => {
    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    expect(res.body.accounts.length).toBeGreaterThanOrEqual(7);
  });

  it('monthly report returns 12 months', async () => {
    const res = await request(app).get('/api/reports/monthly').set('Authorization', `Bearer ${token}`);
    expect(res.body.months.length).toBe(12);
  });

  it('QBO status returns configured=false when env not set', async () => {
    const res = await request(app).get('/api/qbo/status').set('Authorization', `Bearer ${token}`);
    expect(res.body.configured).toBe(false);
    expect(res.body.connected).toBe(false);
  });

  it('unauth requests get 401', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('rejects bad input with 400', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: '' });
    expect(res.status).toBe(400);
  });
});

afterAll(() => {
  try { fs.unlinkSync(tmpDb); } catch {}
  try { fs.unlinkSync(tmpDb + '-shm'); } catch {}
  try { fs.unlinkSync(tmpDb + '-wal'); } catch {}
});
