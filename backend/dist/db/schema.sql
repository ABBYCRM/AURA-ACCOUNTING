-- AURA Accounting schema
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ein TEXT,
  address TEXT,
  fiscalYearEnd TEXT NOT NULL DEFAULT '12-31',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  companyId INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  ssnLast4 TEXT,
  address TEXT,
  hireDate TEXT,
  terminationDate TEXT,
  filingStatus TEXT,
  allowances INTEGER NOT NULL DEFAULT 0,
  hourlyRate REAL,
  annualSalary REAL,
  ytdGross REAL NOT NULL DEFAULT 0,
  ytdFed REAL NOT NULL DEFAULT 0,
  ytdSs REAL NOT NULL DEFAULT 0,
  ytdMed REAL NOT NULL DEFAULT 0,
  ytdState REAL NOT NULL DEFAULT 0,
  qboEmployeeId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS contractors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  businessName TEXT,
  tinLast4 TEXT,
  tinType TEXT NOT NULL DEFAULT 'ssn',
  address TEXT,
  email TEXT,
  ytdPayments REAL NOT NULL DEFAULT 0,
  qboVendorId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  periodStart TEXT NOT NULL,
  periodEnd TEXT NOT NULL,
  payDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  totalGross REAL NOT NULL DEFAULT 0,
  totalNet REAL NOT NULL DEFAULT 0,
  totalTax REAL NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payrollRunId INTEGER NOT NULL,
  employeeId INTEGER NOT NULL,
  hours REAL NOT NULL DEFAULT 0,
  gross REAL NOT NULL DEFAULT 0,
  fed REAL NOT NULL DEFAULT 0,
  ss REAL NOT NULL DEFAULT 0,
  med REAL NOT NULL DEFAULT 0,
  state REAL NOT NULL DEFAULT 0,
  net REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (payrollRunId) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS w2_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  employeeId INTEGER NOT NULL,
  taxYear INTEGER NOT NULL,
  wages REAL NOT NULL DEFAULT 0,
  fedTax REAL NOT NULL DEFAULT 0,
  ssWages REAL NOT NULL DEFAULT 0,
  ssTax REAL NOT NULL DEFAULT 0,
  medWages REAL NOT NULL DEFAULT 0,
  medTax REAL NOT NULL DEFAULT 0,
  stateWages REAL NOT NULL DEFAULT 0,
  stateTax REAL NOT NULL DEFAULT 0,
  box12Codes TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employeeId, taxYear),
  FOREIGN KEY (companyId) REFERENCES companies(id),
  FOREIGN KEY (employeeId) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS form1099_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  contractorId INTEGER NOT NULL,
  taxYear INTEGER NOT NULL,
  formType TEXT NOT NULL DEFAULT 'NEC',
  box1NonemployeeComp REAL NOT NULL DEFAULT 0,
  box2DirectSales REAL NOT NULL DEFAULT 0,
  box3 REAL NOT NULL DEFAULT 0,
  box4FedTax REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(contractorId, taxYear, formType),
  FOREIGN KEY (companyId) REFERENCES companies(id),
  FOREIGN KEY (contractorId) REFERENCES contractors(id)
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  qboAccountId TEXT,
  UNIQUE(companyId, code),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  customerName TEXT NOT NULL,
  customerEmail TEXT,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  issueDate TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  paidDate TEXT,
  qboInvoiceId TEXT,
  memo TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL,
  vendorName TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  accountId INTEGER,
  deductible INTEGER NOT NULL DEFAULT 1,
  qboExpenseId TEXT,
  memo TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id),
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS qbo_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL UNIQUE,
  realmId TEXT NOT NULL,
  accessToken TEXT NOT NULL,
  refreshToken TEXT NOT NULL,
  accessTokenExpiresAt TEXT NOT NULL,
  refreshTokenExpiresAt TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  connectedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER,
  userId INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entityId INTEGER,
  details TEXT,
  ip TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(companyId);
CREATE INDEX IF NOT EXISTS idx_contractors_company ON contractors(companyId);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(companyId);
CREATE INDEX IF NOT EXISTS idx_w2_company ON w2_records(companyId, taxYear);
CREATE INDEX IF NOT EXISTS idx_1099_company ON form1099_records(companyId, taxYear);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(companyId);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(companyId);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(companyId);
