import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, api } from '../lib/api';
import { useEffect, useState } from 'react';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/employees', label: 'Employees', icon: '👥' },
  { to: '/contractors', label: 'Contractors', icon: '🤝' },
  { to: '/payroll', label: 'Payroll', icon: '💰' },
  { to: '/w2', label: 'W-2 Prep', icon: '📄' },
  { to: '/1099', label: '1099-NEC', icon: '📋' },
  { to: '/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/expenses', label: 'Expenses', icon: '💸' },
  { to: '/accounts', label: 'Chart of Accounts', icon: '📚' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth();
  const loc = useLocation();
  const [qboStatus, setQboStatus] = useState<{ connected: boolean; configured: boolean } | null>(null);

  useEffect(() => {
    api<{ connected: boolean; configured: boolean }>('/api/qbo/status')
      .then((s) => setQboStatus({ connected: s.connected, configured: s.configured }))
      .catch(() => setQboStatus({ connected: false, configured: false }));
  }, [loc.pathname]);

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">A</div>
            <div>
              <div className="font-bold text-slate-900">AURA Accounting</div>
              <div className="text-[11px] text-slate-500">{user?.companyName || 'Your Company'}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-2">
          {qboStatus && (
            <div
              className={`text-xs px-3 py-2 rounded-lg ${
                qboStatus.connected
                  ? 'bg-emerald-50 text-emerald-700'
                  : qboStatus.configured
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-50 text-slate-500'
              }`}
            >
              {qboStatus.connected
                ? '✓ QuickBooks connected'
                : qboStatus.configured
                ? '⚠ QuickBooks not connected'
                : '○ QuickBooks not configured'}
            </div>
          )}
          <div className="px-3 py-2">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="text-sm font-medium text-slate-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            <button
              onClick={() => {
                api('/api/auth/logout', { method: 'POST' }).finally(() => {
                  logout();
                  location.href = '/login';
                });
              }}
              className="mt-2 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
