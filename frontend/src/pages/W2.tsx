import { useEffect, useState } from 'react';
import { api, formatCurrency, useAuth } from '../lib/api';

interface Employee { id: number; firstName: string; lastName: string; ytdGross: number; }
interface W2 { id: number; employeeId: number; taxYear: number; wages: number; fedTax: number; ssWages: number; ssTax: number; medWages: number; medTax: number; stateWages: number; stateTax: number; status: string; firstName: string; lastName: string; ssnLast4: string | null; }

export default function W2() {
  const year = new Date().getFullYear();
  const [items, setItems] = useState<W2[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    Promise.all([
      api<{ w2s: W2[] }>(`/api/w2?year=${year}`),
      api<{ employees: Employee[] }>('/api/employees'),
    ]).then(([w, e]) => { setItems(w.w2s); setEmployees(e.employees); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const generateAll = async () => {
    setGenerating(true);
    try {
      for (const e of employees) {
        if (e.ytdGross > 0) {
          await api(`/api/w2/generate/${e.id}/${year}`, { method: 'POST' });
        }
      }
      load();
    } finally {
      setGenerating(false);
    }
  };

  const finalize = async () => {
    if (!confirm(`Mark all draft W-2s for ${year} as final? They will be locked from further editing.`)) return;
    await api('/api/w2/finalize', { method: 'POST', body: { year } });
    load();
  };

  const downloadPdf = (id: number) => {
    window.open(`/api/w2/pdf/${id}`, '_blank');
  };

  const isGenerated = (empId: number) => items.find((w) => w.employeeId === empId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">W-2 Preparation</h1>
        <p className="text-slate-500">Generate W-2s for {year} from payroll YTD. Click a row to download the PDF.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={generateAll} disabled={generating || employees.length === 0}>
          {generating ? 'Generating…' : `Generate W-2s for all ${employees.length} employees`}
        </button>
        {items.some((w) => w.status === 'draft') && (
          <button className="btn-secondary" onClick={finalize}>
            Finalize all drafts
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3 text-right">Wages (Box 1)</th>
              <th className="px-4 py-3 text-right">Fed Tax (Box 2)</th>
              <th className="px-4 py-3 text-right">SS Wages</th>
              <th className="px-4 py-3 text-right">SS Tax</th>
              <th className="px-4 py-3 text-right">Med Wages</th>
              <th className="px-4 py-3 text-right">Med Tax</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No employees.</td></tr>
            ) : employees.map((e) => {
              const w = isGenerated(e.id);
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{e.firstName} {e.lastName}</td>
                  {w ? (
                    <>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.wages)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.fedTax)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.ssWages)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.ssTax)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.medWages)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(w.medTax)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${w.status === 'final' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => downloadPdf(w.id)} className="text-sm text-brand-600 hover:underline">PDF</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={7} className="px-4 py-3 text-slate-400 text-center">Not generated — YTD {formatCurrency(e.ytdGross)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={async () => { await api(`/api/w2/generate/${e.id}/${year}`, { method: 'POST' }); load(); }} className="text-sm text-brand-600 hover:underline">Generate</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200 text-amber-900 text-sm">
        <strong>Heads up:</strong> W-2s generated here are previews based on the current YTD. For IRS filing you must use SSA's W-2 Online or mail official forms. The values here come from your payroll runs — make sure they're accurate before distributing to employees.
      </div>
    </div>
  );
}
