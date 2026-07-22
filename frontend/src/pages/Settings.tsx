import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, useAuth } from '../lib/api';

interface Company { id: number; name: string; ein: string | null; address: string | null; fiscalYearEnd: string; }
interface User { id: number; email: string; name: string; role: string; createdAt: string; }
interface QboStatus { configured: boolean; environment: string; connected: boolean; connection: any; }

export default function Settings() {
  const { user, setAuth } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'company';
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [qbo, setQbo] = useState<QboStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ user: any }>('/api/auth/me').then((r) => {
      setCompany({
        id: r.user.companyId,
        name: r.user.companyName,
        ein: r.user.ein || '',
        address: r.user.address || '',
        fiscalYearEnd: r.user.fiscalYearEnd,
      });
    });
    api<{ users: User[] }>('/api/team/users').then((r) => setUsers(r.users)).catch(() => {});
    api<QboStatus>('/api/qbo/status').then(setQbo).catch(() => {});
  }, []);

  // Show success on qbo=connected
  useEffect(() => {
    if (params.get('qbo') === 'connected') {
      setMsg('QuickBooks connected successfully.');
      setTimeout(() => setMsg(''), 4000);
    }
  }, [params]);

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/auth/me', { method: 'PATCH', body: company });
      setMsg('Company saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  const connectQbo = async () => {
    try {
      const res = await api<{ url: string }>('/api/qbo/connect');
      location.href = res.url;
    } catch (e: any) {
      setMsg('QBO: ' + e.message);
    }
  };

  const disconnectQbo = async () => {
    if (!confirm('Disconnect QuickBooks? You can reconnect later.')) return;
    await api('/api/qbo/disconnect', { method: 'POST' });
    api<QboStatus>('/api/qbo/status').then(setQbo);
  };

  const sync = async (path: string) => {
    setMsg('Syncing from QuickBooks…');
    try {
      const res = await api<{ count: number }>(path, { method: 'POST' });
      setMsg(`Synced ${res.count} records.`);
    } catch (e: any) {
      setMsg('Sync error: ' + e.message);
    }
    setTimeout(() => setMsg(''), 5000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Company profile, team, and integrations.</p>
      </div>

      {msg && <div className="card p-3 bg-emerald-50 border-emerald-200 text-emerald-800 text-sm">{msg}</div>}

      <div className="flex gap-2 border-b border-slate-200">
        {['company', 'team', 'integrations', 'security'].map((t) => (
          <button
            key={t}
            onClick={() => setParams({ tab: t })}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'qbo' ? 'QuickBooks' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'company' && company && (
        <form onSubmit={saveCompany} className="card p-6 space-y-4 max-w-2xl">
          <div>
            <label className="label">Company name</label>
            <input className="input" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
          </div>
          <div>
            <label className="label">EIN</label>
            <input className="input" value={company.ein || ''} onChange={(e) => setCompany({ ...company, ein: e.target.value })} placeholder="XX-XXXXXXX" />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={3} value={company.address || ''} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Fiscal year end (MM-DD)</label>
            <input className="input" value={company.fiscalYearEnd} onChange={(e) => setCompany({ ...company, fiscalYearEnd: e.target.value })} placeholder="12-31" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
        </form>
      )}

      {tab === 'team' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-700">{u.role}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.createdAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200">
            Team invitations are part of the upcoming release. For now, share the registration link with trusted members.
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">QuickBooks Online</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Sync customers, invoices, and chart of accounts to/from QuickBooks.
                </p>
                {qbo && (
                  <div className="mt-2 text-sm">
                    {qbo.connected ? (
                      <span className="text-emerald-600">✓ Connected to realm {qbo.connection?.realmId} ({qbo.environment})</span>
                    ) : qbo.configured ? (
                      <span className="text-amber-600">Configured but not connected.</span>
                    ) : (
                      <span className="text-slate-500">Not configured. Set <code>QBO_CLIENT_ID</code>, <code>QBO_CLIENT_SECRET</code>, <code>QBO_REDIRECT_URI</code> in the service environment.</span>
                    )}
                  </div>
                )}
              </div>
              {qbo?.connected ? (
                <button onClick={disconnectQbo} className="btn-secondary">Disconnect</button>
              ) : (
                <button onClick={connectQbo} disabled={!qbo?.configured} className="btn-primary">
                  Connect QuickBooks
                </button>
              )}
            </div>
            {qbo?.connected && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => sync('/api/qbo/sync/customers')} className="btn-secondary">Sync Customers</button>
                <button onClick={() => sync('/api/qbo/sync/invoices')} className="btn-secondary">Sync Invoices</button>
                <button onClick={() => sync('/api/qbo/sync/accounts')} className="btn-secondary">Sync Accounts</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="font-semibold text-slate-900 mb-4">Change password</h3>
          <ChangePasswordForm onMsg={setMsg} />
        </div>
      )}
    </div>
  );
}

function ChangePasswordForm({ onMsg }: { onMsg: (s: string) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      onMsg('Password changed.');
      setCurrent(''); setNext('');
      setTimeout(() => onMsg(''), 3000);
    } catch (e: any) { onMsg('Error: ' + e.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Current password</label>
        <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div>
        <label className="label">New password (min 8 chars)</label>
        <input type="password" minLength={8} className="input" value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}
