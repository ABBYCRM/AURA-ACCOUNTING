import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../lib/api';

interface Account { id: number; code: string; name: string; type: string; balance: number; qboAccountId: string | null; }
const empty = { code: '', name: '', type: 'asset', balance: 0 };

const TYPE_BADGE: Record<string, string> = {
  asset: 'bg-blue-50 text-blue-700',
  liability: 'bg-rose-50 text-rose-700',
  equity: 'bg-violet-50 text-violet-700',
  income: 'bg-emerald-50 text-emerald-700',
  expense: 'bg-amber-50 text-amber-700',
};

export default function Accounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api<{ accounts: Account[] }>('/api/accounts').then((r) => setItems(r.accounts)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = (a?: Account) => {
    setEditing(a || null);
    setForm(a ? { ...a } : empty);
    setShowForm(true);
    setErr('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const payload = { ...form, balance: Number(form.balance) || 0 };
    try {
      if (editing) await api(`/api/accounts/${editing.id}`, { method: 'PATCH', body: payload });
      else await api('/api/accounts', { method: 'POST', body: payload });
      setShowForm(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this account?')) return;
    await api(`/api/accounts/${id}`, { method: 'DELETE' });
    load();
  };

  const groups: Record<string, Account[]> = {};
  for (const a of items) {
    (groups[a.type] ||= []).push(a);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-slate-500">{items.length} accounts. Organized by type.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}>+ Add account</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} account</h2>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Code</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Opening balance</label>
              <input type="number" step="0.01" className="input" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            </div>
            {err && <div className="md:col-span-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="md:col-span-4 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(groups).map(([type, accounts]) => (
            <div key={type} className="card overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase text-slate-600">{type}</h3>
                <span className={`badge ${TYPE_BADGE[type]}`}>{accounts.length}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-500 w-20">{a.code}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{a.name}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(a.balance)}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button onClick={() => open(a)} className="text-xs text-brand-600 hover:underline">Edit</button>
                        <button onClick={() => remove(a.id)} className="text-xs text-rose-600 hover:underline">Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
