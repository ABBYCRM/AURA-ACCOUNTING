import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../lib/api';

interface Invoice { id: number; customerName: string; customerEmail: string | null; amount: number; status: string; issueDate: string; dueDate: string; paidDate: string | null; memo: string | null; }
const empty = { customerName: '', customerEmail: '', amount: 0, status: 'draft', issueDate: new Date().toISOString().slice(0, 10), dueDate: '', memo: '' };

export default function Invoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api<{ invoices: Invoice[] }>('/api/invoices').then((r) => setItems(r.invoices)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = (i?: Invoice) => {
    setEditing(i || null);
    setForm(i ? { ...i, customerEmail: i.customerEmail || '', memo: i.memo || '' } : empty);
    setShowForm(true);
    setErr('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      customerEmail: form.customerEmail || null,
      memo: form.memo || null,
    };
    try {
      if (editing) await api(`/api/invoices/${editing.id}`, { method: 'PATCH', body: payload });
      else await api('/api/invoices', { method: 'POST', body: payload });
      setShowForm(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this invoice?')) return;
    await api(`/api/invoices/${id}`, { method: 'DELETE' });
    load();
  };

  const markPaid = async (i: Invoice) => {
    await api(`/api/invoices/${i.id}`, { method: 'PATCH', body: { status: 'paid' } });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">{items.length} invoices. {items.filter((i) => i.status === 'overdue').length} overdue.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}>+ New invoice</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} invoice</h2>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer name</label>
              <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input type="email" className="input" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            </div>
            <div>
              <label className="label">Amount (USD)</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="label">Issue date</label>
              <input type="date" className="input" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
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
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No invoices yet.</td></tr>
            ) : items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{i.customerName}<div className="text-xs text-slate-500">{i.customerEmail}</div></td>
                <td className="px-4 py-3">
                  <span className={`badge ${i.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : i.status === 'overdue' ? 'bg-rose-50 text-rose-700' : i.status === 'sent' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(i.issueDate)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(i.dueDate)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(i.amount)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  {i.status !== 'paid' && <button onClick={() => markPaid(i)} className="text-sm text-emerald-600 hover:underline">Mark paid</button>}
                  <button onClick={() => open(i)} className="text-sm text-brand-600 hover:underline">Edit</button>
                  <button onClick={() => remove(i.id)} className="text-sm text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
