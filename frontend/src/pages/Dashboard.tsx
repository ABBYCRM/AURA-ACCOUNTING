import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

interface DashStats {
  ytdRevenue: number;
  outstandingInvoices: number;
  ytdExpenses: number;
  payrollYTD: number;
  payrollTaxYTD: number;
  profit: number;
  employeeCount: number;
  contractorCount: number;
  overdueCount: number;
  ytd1099Total: number;
}

interface MonthlyPoint { month: string; revenue: number; expenses: number; }

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<DashStats>('/api/reports/dashboard'),
      api<{ months: MonthlyPoint[] }>('/api/reports/monthly'),
    ])
      .then(([s, m]) => {
        setStats(s);
        setMonthly(m.months);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="text-slate-500">Loading dashboard…</div>;
  }

  const cards = [
    { label: 'YTD Revenue', value: formatCurrency(stats.ytdRevenue), accent: 'text-emerald-600' },
    { label: 'YTD Expenses', value: formatCurrency(stats.ytdExpenses), accent: 'text-rose-600' },
    { label: 'Payroll YTD', value: formatCurrency(stats.payrollYTD), accent: 'text-amber-600' },
    { label: 'Net Profit', value: formatCurrency(stats.profit), accent: stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
  ];

  const meta = [
    { label: 'Employees', value: stats.employeeCount },
    { label: 'Contractors', value: stats.contractorCount },
    { label: 'Overdue Invoices', value: stats.overdueCount },
    { label: 'Outstanding', value: formatCurrency(stats.outstandingInvoices) },
    { label: '1099 YTD', value: formatCurrency(stats.ytd1099Total) },
    { label: 'Payroll Tax YTD', value: formatCurrency(stats.payrollTaxYTD) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Your financial picture at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 ${c.accent}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {meta.map((m) => (
          <div key={m.label} className="card p-4 flex justify-between items-center">
            <div className="text-sm text-slate-600">{m.label}</div>
            <div className="text-lg font-semibold text-slate-900">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue vs Expenses (12 months)</h2>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
