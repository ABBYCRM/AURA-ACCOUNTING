import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../aura-accounting.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Seed default company + admin if no users exist
const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
if (userCount === 0) {
  seedDefaults();
}

function seedDefaults() {
  const tx = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO companies (name, ein, address, fiscalYearEnd) VALUES (?, ?, ?, ?)'
    ).run('My Company', '', '', '12-31');

    const companyId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;

    // Default password: "admin" (bcrypt below)
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(
      'INSERT INTO users (email, passwordHash, name, role, companyId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('admin@aura.local', hash, 'Admin', 'admin', companyId, now);

    // Default chart of accounts
    const accounts = [
      ['1000', 'Cash', 'asset'],
      ['1100', 'Accounts Receivable', 'asset'],
      ['1200', 'Inventory', 'asset'],
      ['1500', 'Equipment', 'asset'],
      ['2000', 'Accounts Payable', 'liability'],
      ['2100', 'Credit Card', 'liability'],
      ['2200', 'Payroll Liabilities', 'liability'],
      ['3000', 'Owner Equity', 'equity'],
      ['3100', 'Retained Earnings', 'equity'],
      ['4000', 'Sales Revenue', 'income'],
      ['4100', 'Service Revenue', 'income'],
      ['5000', 'Cost of Goods Sold', 'expense'],
      ['6000', 'Rent Expense', 'expense'],
      ['6100', 'Utilities', 'expense'],
      ['6200', 'Payroll Expense', 'expense'],
      ['6300', 'Marketing', 'expense'],
      ['6400', 'Software & Subscriptions', 'expense'],
      ['6500', 'Travel', 'expense'],
      ['6600', 'Office Supplies', 'expense'],
      ['6700', 'Professional Services', 'expense'],
      ['6800', 'Insurance', 'expense'],
      ['6900', 'Miscellaneous', 'expense'],
    ];
    const insertAccount = db.prepare(
      'INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, 0)'
    );
    for (const [code, name, type] of accounts) {
      insertAccount.run(companyId, code, name, type);
    }

    db.prepare(
      'INSERT INTO audit_log (companyId, userId, action, entity, details) VALUES (?, NULL, ?, ?, ?)'
    ).run(companyId, 'system.bootstrap', 'system', JSON.stringify({ note: 'Initial seed complete' }));
  });
  tx();
}

export function logAudit(opts: {
  companyId?: number | null;
  userId?: number | null;
  action: string;
  entity?: string;
  entityId?: number | null;
  details?: any;
  ip?: string | null;
}) {
  db.prepare(
    'INSERT INTO audit_log (companyId, userId, action, entity, entityId, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    opts.companyId ?? null,
    opts.userId ?? null,
    opts.action,
    opts.entity ?? null,
    opts.entityId ?? null,
    opts.details ? JSON.stringify(opts.details) : null,
    opts.ip ?? null
  );
}

export default db;
