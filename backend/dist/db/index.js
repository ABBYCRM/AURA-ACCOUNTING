"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.logAudit = logAudit;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../aura-accounting.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
exports.db = new better_sqlite3_1.default(dbPath);
exports.db.pragma('journal_mode = WAL');
exports.db.pragma('foreign_keys = ON');
// Apply schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
exports.db.exec(schema);
// Seed default company + admin if no users exist
const userCount = exports.db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
    seedDefaults();
}
function seedDefaults() {
    const tx = exports.db.transaction(() => {
        const now = new Date().toISOString();
        exports.db.prepare('INSERT INTO companies (name, ein, address, fiscalYearEnd) VALUES (?, ?, ?, ?)').run('My Company', '', '', '12-31');
        const companyId = exports.db.prepare('SELECT last_insert_rowid() as id').get().id;
        // Default password: "admin" (bcrypt below)
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('admin', 10);
        exports.db.prepare('INSERT INTO users (email, passwordHash, name, role, companyId, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run('admin@aura.local', hash, 'Admin', 'admin', companyId, now);
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
        const insertAccount = exports.db.prepare('INSERT INTO accounts (companyId, code, name, type, balance) VALUES (?, ?, ?, ?, 0)');
        for (const [code, name, type] of accounts) {
            insertAccount.run(companyId, code, name, type);
        }
        exports.db.prepare('INSERT INTO audit_log (companyId, userId, action, entity, details) VALUES (?, NULL, ?, ?, ?)').run(companyId, 'system.bootstrap', 'system', JSON.stringify({ note: 'Initial seed complete' }));
    });
    tx();
}
function logAudit(opts) {
    exports.db.prepare('INSERT INTO audit_log (companyId, userId, action, entity, entityId, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)').run(opts.companyId ?? null, opts.userId ?? null, opts.action, opts.entity ?? null, opts.entityId ?? null, opts.details ? JSON.stringify(opts.details) : null, opts.ip ?? null);
}
exports.default = exports.db;
//# sourceMappingURL=index.js.map