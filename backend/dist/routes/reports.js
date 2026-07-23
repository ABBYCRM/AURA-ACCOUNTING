"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/dashboard', (req, res) => {
    const companyId = req.user.companyId;
    const ytdRevenue = db_1.default
        .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status = 'paid'")
        .get(companyId).s;
    const outstandingInvoices = db_1.default
        .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status IN ('sent', 'overdue')")
        .get(companyId).s;
    const ytdExpenses = db_1.default
        .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE companyId = ? AND deductible = 1")
        .get(companyId).s;
    const payrollYTD = db_1.default
        .prepare('SELECT COALESCE(SUM(ytdGross), 0) as s FROM employees WHERE companyId = ?')
        .get(companyId).s;
    const payrollTaxYTD = db_1.default
        .prepare('SELECT COALESCE(SUM(ytdFed + ytdSs + ytdMed + ytdState), 0) as s FROM employees WHERE companyId = ?')
        .get(companyId).s;
    const employeeCount = db_1.default
        .prepare('SELECT COUNT(*) as c FROM employees WHERE companyId = ?')
        .get(companyId).c;
    const contractorCount = db_1.default
        .prepare('SELECT COUNT(*) as c FROM contractors WHERE companyId = ?')
        .get(companyId).c;
    const overdueCount = db_1.default
        .prepare("SELECT COUNT(*) as c FROM invoices WHERE companyId = ? AND status = 'overdue'")
        .get(companyId).c;
    const ytd1099Total = db_1.default
        .prepare("SELECT COALESCE(SUM(box1NonemployeeComp), 0) as s FROM form1099_records WHERE companyId = ?")
        .get(companyId).s;
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
router.get('/monthly', (req, res) => {
    const companyId = req.user.companyId;
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const start = `${yyyy}-${mm}-01`;
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const end = `${yyyy}-${mm}-${lastDay}`;
        const rev = db_1.default
            .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM invoices WHERE companyId = ? AND status = 'paid' AND paidDate BETWEEN ? AND ?")
            .get(companyId, start, end).s;
        const exp = db_1.default
            .prepare('SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE companyId = ? AND date BETWEEN ? AND ?')
            .get(companyId, start, end).s;
        months.push({ month: `${yyyy}-${mm}`, revenue: rev, expenses: exp });
    }
    res.json({ months });
});
router.get('/pnl', (req, res) => {
    const companyId = req.user.companyId;
    const income = db_1.default
        .prepare(`SELECT a.code, a.name, COALESCE(SUM(i.amount), 0) as total
       FROM accounts a
       LEFT JOIN invoices i ON i.companyId = a.companyId AND i.status = 'paid' AND i.paidDate BETWEEN date('now', 'start of year') AND date('now')
       WHERE a.companyId = ? AND a.type = 'income'
       GROUP BY a.id
       ORDER BY a.code`)
        .all(companyId);
    const expenses = db_1.default
        .prepare(`SELECT a.code, a.name, COALESCE(SUM(e.amount), 0) as total
       FROM accounts a
       LEFT JOIN expenses e ON e.companyId = a.companyId AND e.date BETWEEN date('now', 'start of year') AND date('now')
       WHERE a.companyId = ? AND a.type = 'expense'
       GROUP BY a.id
       ORDER BY a.code`)
        .all(companyId);
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
exports.default = router;
//# sourceMappingURL=reports.js.map