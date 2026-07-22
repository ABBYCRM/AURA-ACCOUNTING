import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', (req: Request, res: Response) => {
  const companyId = req.user!.companyId;
  const ytdRevenue = (db
    .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status = 'paid'")
    .get(companyId) as { s: number }).s;
  const outstandingInvoices = (db
    .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status IN ('sent', 'overdue')")
    .get(companyId) as { s: number }).s;
  const ytdExpenses = (db
    .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE companyId = ? AND deductible = 1")
    .get(companyId) as { s: number }).s;
  const payrollYTD = (db
    .prepare('SELECT COALESCE(SUM(ytdGross), 0) as s FROM employees WHERE companyId = ?')
    .get(companyId) as { s: number }).s;
  const payrollTaxYTD = (db
    .prepare('SELECT COALESCE(SUM(ytdFed + ytdSs + ytdMed + ytdState), 0) as s FROM employees WHERE companyId = ?')
    .get(companyId) as { s: number }).s;
  const employeeCount = (db
    .prepare('SELECT COUNT(*) as c FROM employees WHERE companyId = ?')
    .get(companyId) as { c: number }).c;
  const contractorCount = (db
    .prepare('SELECT COUNT(*) as c FROM contractors WHERE companyId = ?')
    .get(companyId) as { c: number }).c;
  const overdueCount = (db
    .prepare("SELECT COUNT(*) as c FROM invoices WHERE companyId = ? AND status = 'overdue'")
    .get(companyId) as { c: number }).c;
  const ytd1099Total = (db
    .prepare("SELECT COALESCE(SUM(box1NonemployeeComp), 0) as s FROM form1099_records WHERE companyId = ?")
    .get(companyId) as { s: number }).s;

  const profit = ytdRevenue - ytdExpenses - payrollYTD - payrollTaxYTD;

  res.json({
    ytdRevenue,
    outstandingInvoices,
    ytdExpenses,
    payrollYTD,
    payrollTaxYTD,
    profit,
    employeeCount,
    contractorCount,
    overdueCount,
    ytd1099Total,
  });
});

router.get('/monthly', (req: Request, res: Response) => {
  const companyId = req.user!.companyId;
  const months: { month: string; revenue: number; expenses: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const start = `${yyyy}-${mm}-01`;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const end = `${yyyy}-${mm}-${lastDay}`;
    const rev = (db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status = 'paid' AND paidDate BETWEEN ? AND ?"
      )
      .get(companyId, start, end) as { s: number }).s;
    const exp = (db
      .prepare('SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE companyId = ? AND date BETWEEN ? AND ?')
      .get(companyId, start, end) as { s: number }).s;
    months.push({ month: `${yyyy}-${mm}`, revenue: rev, expenses: exp });
  }
  res.json({ months });
});

router.get('/pnl', (req: Request, res: Response) => {
  const companyId = req.user!.companyId;
  const income = db
    .prepare(
      `SELECT a.code, a.name, COALESCE(SUM(i.amount), 0) as total
       FROM accounts a
       LEFT JOIN invoices i ON i.companyId = a.companyId AND i.status = 'paid' AND i.paidDate BETWEEN date('now', 'start of year') AND date('now')
       WHERE a.companyId = ? AND a.type = 'income'
       GROUP BY a.id
       ORDER BY a.code`
    )
    .all(companyId) as any[];
  const expenses = db
    .prepare(
      `SELECT a.code, a.name, COALESCE(SUM(e.amount), 0) as total
       FROM accounts a
       LEFT JOIN expenses e ON e.companyId = a.companyId AND e.date BETWEEN date('now', 'start of year') AND date('now')
       WHERE a.companyId = ? AND a.type = 'expense'
       GROUP BY a.id
       ORDER BY a.code`
    )
    .all(companyId) as any[];
  const totalIncome = income.reduce((s, r) => s + r.total, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.total, 0);
  res.json({
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
  });
});

export default router;
