import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../lib/api';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  ssnLast4: string | null;
  address: string | null;
  hireDate: string | null;
  filingStatus: string | null;
  hourlyRate: number | null;
  annualSalary: number | null;
  ytdGross: number;
  ytdFed: number;
  ytdSs: number;
  ytdMed: number;
  ytdState: number;
}

const empty = { firstName: '', lastName: '', ssnLast4: '', address: '', hireDate: '', filingStatus: '', allowances: 0, hourlyRate: 0, annualSalary: 0 };

export default function Employees() {
  const [items, setItems] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api<{ employees: Employee[] }>('/api/employees')
      .then((r) => setItems(r.employees))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const open = (e?: Employee) => {
    setEditing(e || null);
    setForm(e ? {
      firstName: e.firstName, lastName: e.lastName, ssnLast4: e.ssnLast4 || '',
      address: e.address || '', hireDate: e.hireDate || '', filingStatus: e.filingStatus || '',
      allowances: 0, hourlyRate: e.hourlyRate || 0, annualSalary: e.annualSalary || 0,
    } : empty);
    setShowForm(true);
    setErr('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      ssnLast4: form.ssnLast4 || null,
      address: form.address || null,
      hireDate: form.hireDate || null,
      filingStatus: form.filingStatus || null,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      annualSalary: form.annualSalary ? Number(form.annualSalary) : null,
      allowances: Number(form.allowances) || 0,
    };
    try {
      if (editing) {
        await api(`/api/employees/${editing.id}`, { method: 'PATCH', body: payload });
      } else {
        await api('/api/employees', { method: 'POST', body: payload });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this employee? This cannot be undone.')) return;
    await api(`/api/employees/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">Manage your W-2 team. {items.length} on payroll.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}>+ Add employee</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} employee</h2>
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
              <label className="label">SSN (last 4)</label>
              <input className="input" maxLength={4} value={form.ssnLast4} onChange={(e) => setForm({ ...form, ssnLast4: e.target.value })} />
            </div>
            <div>
              <label className="label">Hire date</label>
              <input type="date" className="input" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Filing status</label>
              <select className="input" value={form.filingStatus} onChange={(e) => setForm({ ...form, filingStatus: e.target.value })}>
                <option value="">—</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="hoh">Head of household</option>
              </select>
            </div>
            <div>
              <label className="label">Allowances</label>
              <input type="number" min={0} className="input" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} />
            </div>
            <div>
              <label className="label">Hourly rate (USD)</label>
              <input type="number" step="0.01" className="input" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
            </div>
            <div>
              <label className="label">Annual salary (USD)</label>
              <input type="number" step="0.01" className="input" value={form.annualSalary} onChange={(e) => setForm({ ...form, annualSalary: e.target.value })} />
            </div>
            {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Create employee'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Hire date</th>
              <th className="px-4 py-3">Compensation</th>
              <th className="px-4 py-3 text-right">YTD Gross</th>
              <th className="px-4 py-3 text-right">YTD Tax</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No employees yet. Add your first one above.</td></tr>
            ) : items.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{e.firstName} {e.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{e.filingStatus || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(e.hireDate)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {e.annualSalary ? formatCurrency(e.annualSalary) + '/yr' : e.hourlyRate ? formatCurrency(e.hourlyRate) + '/hr' : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.ytdGross)}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatCurrency((e.ytdFed || 0) + (e.ytdSs || 0) + (e.ytdMed || 0) + (e.ytdState || 0))}
                </td>
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
