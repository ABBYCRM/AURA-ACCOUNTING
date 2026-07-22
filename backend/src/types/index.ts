// Shared types
export type UserRole = 'admin' | 'accountant' | 'viewer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  companyId: number;
  createdAt: string;
}

export interface Company {
  id: number;
  name: string;
  ein: string | null;
  address: string | null;
  fiscalYearEnd: string; // MM-DD
  createdAt: string;
}

export interface Employee {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  ssnLast4: string | null;
  address: string | null;
  hireDate: string;
  terminationDate: string | null;
  filingStatus: 'single' | 'married' | 'hoh' | null;
  allowances: number;
  hourlyRate: number | null;
  annualSalary: number | null;
  ytdGross: number;
  ytdFed: number;
  ytdSs: number;
  ytdMed: number;
  ytdState: number;
  qboEmployeeId: string | null;
  createdAt: string;
}

export interface Contractor {
  id: number;
  companyId: number;
  firstName: string;
  lastName: string;
  businessName: string | null;
  tinLast4: string | null;
  tinType: 'ssn' | 'ein';
  address: string | null;
  email: string | null;
  ytdPayments: number;
  qboVendorId: string | null;
  createdAt: string;
}

export interface PayrollRun {
  id: number;
  companyId: number;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: 'draft' | 'approved' | 'paid';
  totalGross: number;
  totalNet: number;
  totalTax: number;
  notes: string | null;
  createdAt: string;
}

export interface PayrollLine {
  id: number;
  payrollRunId: number;
  employeeId: number;
  hours: number;
  gross: number;
  fed: number;
  ss: number;
  med: number;
  state: number;
  net: number;
}

export interface W2Record {
  id: number;
  companyId: number;
  employeeId: number;
  taxYear: number;
  wages: number;
  fedTax: number;
  ssWages: number;
  ssTax: number;
  medWages: number;
  medTax: number;
  stateWages: number;
  stateTax: number;
  box12_codes: string; // JSON
  status: 'draft' | 'final';
  createdAt: string;
}

export interface Form1099Record {
  id: number;
  companyId: number;
  contractorId: number;
  taxYear: number;
  formType: 'NEC' | 'MISC';
  box1_nonemployeeComp: number;
  box2_directSales: number;
  box3: number;
  box4_fedTax: number;
  status: 'draft' | 'final';
  createdAt: string;
}

export interface Account {
  id: number;
  companyId: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance: number;
  qboAccountId: string | null;
}

export interface Invoice {
  id: number;
  companyId: number;
  customerName: string;
  customerEmail: string | null;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  qboInvoiceId: string | null;
  memo: string | null;
  createdAt: string;
}

export interface Expense {
  id: number;
  companyId: number;
  vendorName: string;
  category: string;
  amount: number;
  date: string;
  accountId: number | null;
  deductible: boolean;
  qboExpenseId: string | null;
  memo: string | null;
  createdAt: string;
}

export interface QboConnection {
  id: number;
  companyId: number;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  environment: 'sandbox' | 'production';
  connectedAt: string;
}

export interface AuthPayload {
  userId: number;
  companyId: number;
  role: UserRole;
}
