import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../lib/api';

interface Contractor {
  id: number;
  firstName: string;
  lastName: string;
  businessName: string | null;
  tinLast4: string | null;
  tinType: 'ssn' | 'ein';
  email: string | null;
  address: string | null;
  ytdPayments: number;
}

const empty = { firstName: '', lastName: '', businessName: '', tinLast4: '', tinType: 'ssn', email: '', address: '' };

export default function Contractors() {
  const [items, setItems] = useState<Contractor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api<{ contractors: Contractor[] }>('/api/contractors')
      .then((r) => setItems(r.contractors))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const open = (c?: Contractor) => {
    setEditing(c || null);
    setForm(c ? {
      firstName: c.firstName, lastName: c.lastName, businessName: c.businessName || '',
      tinLast4: c.tinLast4 || '', tinType: c.tinType, email: c.email || '', address: c.address || '',
    } : empty);
    setShowForm(true);
    setErr('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      businessName: form.businessName || null,
      tinLast4: form.tinLast4 || null,
      email: form.email || null,
      address: form.address || null,
    };
    try {
      if (editing) {
        await api(`/api/contractors/${editing.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/api/contractors', { method: 'POST', body: payload });
      }
      setShowForm(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this contractor?')) return;
    await api(`/api/contractors/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contractors</h1>
          <p className="text-slate-500">1099-NEC eligible vendors. {items.length} contractors tracked.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}>+ Add contractor</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} contractor</h2>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Business name (optional)</label>
              <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">TIN type</label>
              <select className="input" value={form.tinType} onChange={(e) => setForm({ ...form, tinType: e.target.value })}>
                <option value="ssn">SSN</option>
                <option value="ein">EIN</option>
              </select>
            </div>
            <div>
              <label className="label">TIN (last 4)</label>
              <input className="input" maxLength={4} value={form.tinLast4} onChange={(e) => setForm({ ...form, tinLast4: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create contractor'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">TIN</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">YTD Payments</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No contractors yet.</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.firstName} {c.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{c.businessName || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.tinType.toUpperCase()}-XX-{c.tinLast4 || '____'}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(c.ytdPayments)}
                  {c.ytdPayments >= 600 && <span className="badge bg-amber-50 text-amber-700 ml-2">≥ $600</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => open(c)} className="text-sm text-brand-600 hover:underline">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-sm text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
