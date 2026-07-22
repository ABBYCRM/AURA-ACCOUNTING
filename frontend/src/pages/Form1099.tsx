import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../lib/api';

interface ContractorNEC { id: number; firstName: string; lastName: string; businessName: string | null; ytdPayments: number; needs1099: number; }
interface Form1099 { id: number; contractorId: number; taxYear: number; box1NonemployeeComp: number; status: string; firstName: string; lastName: string; businessName: string | null; }

export default function Form1099() {
  const year = new Date().getFullYear();
  const [contractors, setContractors] = useState<ContractorNEC[]>([]);
  const [forms, setForms] = useState<Form1099[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [threshold, setThreshold] = useState(600);

  const load = () => {
    Promise.all([
      api<{ contractors: ContractorNEC[]; threshold: number }>(`/api/1099/nec-eligible?year=${year}`),
      api<{ forms: Form1099[] }>(`/api/1099?year=${year}&formType=NEC`),
    ]).then(([c, f]) => { setContractors(c.contractors); setThreshold(c.threshold); setForms(f.forms); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const generateAll = async () => {
    setGenerating(true);
    try {
      for (const c of contractors) {
        if (c.needs1099) {
          await api(`/api/1099/generate/${c.id}/${year}`, { method: 'POST' });
        }
      }
      load();
    } finally { setGenerating(false); }
  };

  const finalize = async () => {
    if (!confirm(`Mark all draft 1099-NEC forms for ${year} as final?`)) return;
    await api('/api/1099/finalize', { method: 'POST', body: { year, formType: 'NEC' } });
    load();
  };

  const downloadPdf = (id: number) => window.open(`/api/1099/pdf/${id}`, '_blank');

  const generatedIds = new Set(forms.map((f) => f.contractorId));
  const eligibleCount = contractors.filter((c) => c.needs1099).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">1099-NEC Preparation</h1>
        <p className="text-slate-500">
          Contractors paid {formatCurrency(threshold)} or more in {year} need a 1099-NEC.
          {eligibleCount > 0 && ` You have ${eligibleCount} eligible.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={generateAll} disabled={generating || eligibleCount === 0}>
          {generating ? 'Generating…' : `Generate 1099-NEC for all ${eligibleCount} eligible`}
        </button>
        {forms.some((f) => f.status === 'draft') && (
          <button className="btn-secondary" onClick={finalize}>Finalize all drafts</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contractor</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3 text-right">YTD Payments</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3">Form Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : contractors.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No contractors yet.</td></tr>
            ) : contractors.map((c) => {
              const f = forms.find((x) => x.contractorId === c.id);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.businessName || '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(c.ytdPayments)}</td>
                  <td className="px-4 py-3">
                    {c.needs1099 ? <span className="badge bg-amber-50 text-amber-700">Required</span> : <span className="badge bg-slate-100 text-slate-500">Under threshold</span>}
                  </td>
                  <td className="px-4 py-3">
                    {f ? (
                      <span className={`badge ${f.status === 'final' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {f.status}
                      </span>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {f ? (
                      <button onClick={() => downloadPdf(f.id)} className="text-sm text-brand-600 hover:underline">PDF</button>
                    ) : c.needs1099 ? (
                      <button onClick={async () => { await api(`/api/1099/generate/${c.id}/${year}`, { method: 'POST' }); load(); }} className="text-sm text-brand-600 hover:underline">Generate</button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200 text-amber-900 text-sm">
        <strong>Heads up:</strong> 1099-NEC must be filed with the IRS by January 31 of the following year.
        Use the IRS FIRE system or approved e-filing service for actual filing — these PDFs are previews
        to give to your contractors and verify the numbers.
      </div>
    </div>
  );
}
