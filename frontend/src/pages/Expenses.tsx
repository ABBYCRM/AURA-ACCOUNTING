import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../lib/api';

interface Expense { id: number; vendorName: string; category: string; amount: number; date: string; deductible: boolean; memo: string | null; }
const empty = { vendorName: '', category: 'general', amount: 0, date: new Date().toISOString().slice(0, 10), deductible: true, memo: '' };

const CATEGORIES = ['general', 'rent', 'utilities', 'payroll', 'marketing', 'software', 'travel', 'office', 'professional', 'insurance', 'meals', 'equipment', 'other'];

export default function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api<{ expenses: Expense[] }>('/api/expenses').then((r) => setItems(r.expenses)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = (e?: Expense) => {
    setEditing(e || null);
    setForm(e ? { ...e, memo: e.memo || '' } : empty);
    setShowForm(true);
    setErr('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const payload = { ...form, amount: Number(form.amount) || 0, memo: form.memo || null };
    try {
      if (editing) await api(`/api/expenses/${editing.id}`, { method: 'PATCH', body: payload });
      else await api('/api/expenses', { method: 'POST', body: payload });
      setShowForm(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    await api(`/api/expenses/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Track deductible business expenses.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}>+ Log expense</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} expense</h2>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vendor</label>
              <input className="input" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (USD)</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="flex items-center gap-2">
              <input id="ded" type="checkbox" checked={!!form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.checked })} className="rounded" />
              <label htmlFor="ded" className="text-sm text-slate-700">Tax deductible</label>
            </div>
            <div className="md:col-span-2">
              <label className="label">Memo</label>
              <input className="input" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
            {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Deductible</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No expenses yet.</td></tr>
            ) : items.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{e.vendorName}</td>
                <td className="px-4 py-3 text-slate-600">{e.category}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(e.date)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3">{e.deductible ? <span className="badge bg-emerald-50 text-emerald-700">Yes</span> : <span className="badge bg-slate-100 text-slate-500">No</span>}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => open(e)} className="text-sm text-brand-600 hover:underline">Edit</button>
                  <button onClick={() => remove(e.id)} className="text-sm text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
