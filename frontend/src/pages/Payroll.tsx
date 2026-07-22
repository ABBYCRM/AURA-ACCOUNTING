import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../lib/api';

interface Employee { id: number; firstName: string; lastName: string; hourlyRate: number | null; annualSalary: number | null; }
interface PayrollRun {
  id: number; periodStart: string; periodEnd: string; payDate: string; status: string;
  totalGross: number; totalNet: number; totalTax: number; notes: string | null;
}
interface PayrollLine { id: number; employeeId: number; hours: number; gross: number; net: number; fed: number; ss: number; med: number; state: number; firstName: string; lastName: string; }

export default function Payroll() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<{ run: PayrollRun; lines: PayrollLine[] } | null>(null);
  const [form, setForm] = useState({ periodStart: '', periodEnd: '', payDate: '', notes: '', lines: [] as Array<{ employeeId: number; hours: number }> });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      api<{ runs: PayrollRun[] }>('/api/payroll'),
      api<{ employees: Employee[] }>('/api/employees'),
    ]).then(([r, e]) => { setRuns(r.runs); setEmployees(e.employees); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setForm({
      periodStart: first.toISOString().slice(0, 10),
      periodEnd: last.toISOString().slice(0, 10),
      payDate: last.toISOString().slice(0, 10),
      notes: '',
      lines: employees.map((e) => ({ employeeId: e.id, hours: e.annualSalary ? 0 : 160 })),
    });
    setOpen(true);
    setErr('');
  };

  const updLine = (idx: number, key: 'hours' | 'employeeId', val: any) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [key]: Number(val) };
    setForm({ ...form, lines });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const activeLines = form.lines.filter((l) => l.hours > 0 || employees.find((emp) => emp.id === l.employeeId)?.annualSalary);
    if (!activeLines.length) {
      setErr('Add at least one employee to this payroll run.');
      return;
    }
    try {
      await api('/api/payroll', { method: 'POST', body: { ...form, lines: activeLines } });
      setOpen(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const view = async (id: number) => {
    const res = await api<{ run: PayrollRun; lines: PayrollLine[] }>(`/api/payroll/${id}`);
    setViewing(res);
  };

  const approve = async (id: number) => {
    if (!confirm('Approve this payroll run? YTD values will be locked in for those employees.')) return;
    await api(`/api/payroll/${id}/approve`, { method: 'POST' });
    load();
    if (viewing?.run.id === id) setViewing(null);
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this draft run? YTD values will be reversed.')) return;
    await api(`/api/payroll/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500">Run payroll, calculate withholding, post to YTD.</p>
        </div>
        <button className="btn-primary" onClick={startNew} disabled={employees.length === 0}>+ New run</button>
      </div>

      {employees.length === 0 && (
        <div className="card p-6 bg-amber-50 border-amber-200 text-amber-800">
          You need at least one employee to run payroll. Add employees first.
        </div>
      )}

      {open && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">New payroll run</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Period start</label>
                <input type="date" className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required />
              </div>
              <div>
                <label className="label">Period end</label>
                <input type="date" className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required />
              </div>
              <div>
                <label className="label">Pay date</label>
                <input type="date" className="input" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Lines</h3>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right w-32">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.lines.map((l, idx) => {
                      const e = employees.find((emp) => emp.id === l.employeeId);
                      return (
                        <tr key={l.employeeId}>
                          <td className="px-3 py-2 font-medium">{e?.firstName} {e?.lastName}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {e?.annualSalary ? `Salary ${formatCurrency(e.annualSalary)}/yr` : e?.hourlyRate ? `Hourly ${formatCurrency(e.hourlyRate)}/hr` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {e?.annualSalary ? <span className="text-slate-400 text-xs">1/12 month</span> :
                              <input type="number" min={0} step="0.5" className="input text-right py-1" value={l.hours} onChange={(e) => updLine(idx, 'hours', e.target.value)} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create run (draft)</button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Payroll run #{viewing.run.id}</h2>
              <div className="text-sm text-slate-500">{formatDate(viewing.run.periodStart)} – {formatDate(viewing.run.periodEnd)} • Pay date {formatDate(viewing.run.payDate)}</div>
            </div>
            <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="card p-3"><div className="text-xs text-slate-500">Total Gross</div><div className="text-lg font-semibold">{formatCurrency(viewing.run.totalGross)}</div></div>
            <div className="card p-3"><div className="text-xs text-slate-500">Total Tax</div><div className="text-lg font-semibold">{formatCurrency(viewing.run.totalTax)}</div></div>
            <div className="card p-3"><div className="text-xs text-slate-500">Total Net</div><div className="text-lg font-semibold">{formatCurrency(viewing.run.totalNet)}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Fed</th><th className="px-3 py-2 text-right">SS</th><th className="px-3 py-2 text-right">Med</th><th className="px-3 py-2 text-right">State</th><th className="px-3 py-2 text-right">Net</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewing.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.firstName} {l.lastName}</td>
                  <td className="px-3 py-2 text-right">{l.hours}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.fed)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.ss)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.med)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(l.state)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(l.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Run</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Pay date</th>
              <th className="px-4 py-3 text-right">Gross</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No payroll runs yet.</td></tr>
            ) : runs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">#{r.id}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.periodStart)} – {formatDate(r.periodEnd)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.payDate)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(r.totalGross)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.totalNet)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => view(r.id)} className="text-sm text-brand-600 hover:underline">View</button>
                  {r.status === 'draft' && <button onClick={() => approve(r.id)} className="text-sm text-emerald-600 hover:underline">Approve</button>}
                  {r.status === 'draft' && <button onClick={() => remove(r.id)} className="text-sm text-rose-600 hover:underline">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
