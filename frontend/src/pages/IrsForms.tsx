import { useEffect, useState } from 'react';
import { useAuth } from '../lib/api';

const API = (path: string, token?: string) =>
  fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).then((r) => (r.ok ? r.json() : Promise.reject(r)));

export default function IrsForms() {
  const { token } = useAuth();
  const [rules, setRules] = useState<any>(null);
  const [forms, setForms] = useState<any>(null);
  const [channels, setChannels] = useState<any>(null);
  const [year, setYear] = useState(2026);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      API('/api/irs/rules'),
      API('/api/irs/forms'),
      API('/api/irs/filing-channels'),
      API(`/api/irs/deadlines/${year}`),
    ])
      .then(([r, f, c, d]) => {
        setRules(r);
        setForms(f);
        setChannels(c);
        setDeadlines(d);
      })
      .catch((e) => setError(String(e)));
  }, [year]);
  const [deadlines, setDeadlines] = useState<any>(null);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">IRS Forms & Rules</h1>
          <p className="text-sm text-gray-600 mt-1">
            Official 2026 IRS rules, forms, and filing channels. Every number on
            this page is sourced directly from <a href="https://www.irs.gov" target="_blank" rel="noopener" className="text-blue-600 underline">irs.gov</a> (verified 2026-07-23).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Tax year:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {rules && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Key 2026 IRS Constants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">Social Security</div>
              <div className="text-2xl font-bold">${rules.rules.SS_WAGE_BASE.toLocaleString()}</div>
              <div className="text-xs text-gray-600">wage base 2026</div>
              <div className="text-sm mt-1">6.2% each (employee + employer)</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">Medicare</div>
              <div className="text-2xl font-bold">1.45%</div>
              <div className="text-xs text-gray-600">+ 0.9% over $200,000</div>
              <div className="text-sm mt-1">No wage base limit</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">FUTA</div>
              <div className="text-2xl font-bold">6.0%</div>
              <div className="text-xs text-gray-600">on first $7,000/employee</div>
              <div className="text-sm mt-1">5.4% credit if state SUI paid</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">Std. Deduction — Single</div>
              <div className="text-2xl font-bold">${rules.rules.STD_DEDUCTION.single.toLocaleString()}</div>
              <div className="text-xs text-gray-600">TY 2026 (post-OBBBA)</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">Std. Deduction — MFJ</div>
              <div className="text-2xl font-bold">${rules.rules.STD_DEDUCTION.married.toLocaleString()}</div>
              <div className="text-xs text-gray-600">TY 2026 (post-OBBBA)</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <div className="text-xs uppercase text-gray-500">1099-NEC Threshold</div>
              <div className="text-2xl font-bold">${rules.rules.THRESHOLD_1099_NEC.toLocaleString()}</div>
              <div className="text-xs text-gray-600">was $600 pre-2026 (PL 119-21)</div>
            </div>
          </div>
        </section>
      )}

      {forms && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Official IRS Forms</h2>
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Form</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Revision</th>
                  <th className="text-left p-3">Deadline</th>
                  <th className="text-left p-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {forms.forms.map((f: any) => (
                  <tr key={f.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{f.name}</td>
                    <td className="p-3">{f.title}</td>
                    <td className="p-3 text-gray-600">{f.revision}</td>
                    <td className="p-3 text-gray-600">
                      {f.deadline || f.deadlinePaper || '—'}
                    </td>
                    <td className="p-3 space-x-2">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener"
                        className="text-blue-600 underline text-xs"
                      >
                        IRS PDF
                      </a>
                      {f.about && (
                        <a
                          href={f.about}
                          target="_blank"
                          rel="noopener"
                          className="text-blue-600 underline text-xs"
                        >
                          About
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {channels && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Official Filing Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.channels.map((c: any) => (
              <div key={c.name} className="border rounded p-4 bg-white">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-500 mt-1">For: {c.for.join(', ')}</div>
                <div className="text-sm mt-2">
                  <a href={c.url} target="_blank" rel="noopener" className="text-blue-600 underline break-all">
                    {c.url}
                  </a>
                </div>
                <div className="text-xs text-gray-600 mt-1">Cost: {c.cost}</div>
                {c.important && (
                  <div className="text-xs text-red-600 mt-1 font-semibold">{c.important}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {deadlines && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Filing Deadlines (Tax Year {year})</h2>
          <div className="bg-white border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Form</th>
                  <th className="text-left p-3">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(deadlines.deadlines).map(([k, v]: any) => (
                  <tr key={k} className="border-t">
                    <td className="p-3 font-mono text-xs">{k}</td>
                    <td className="p-3">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Generate Draft Worksheets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Form W-3 (transmittal)', url: '/api/federal-forms/w3/2026' },
            { label: 'Form 1096 — 1099-NEC transmittal', url: '/api/federal-forms/1096/2026?formType=NEC' },
            { label: 'Form 1096 — 1099-MISC transmittal', url: '/api/federal-forms/1096/2026?formType=MISC' },
            { label: 'Form 941 worksheet — Q1 2026', url: '/api/federal-forms/941/2026/1' },
            { label: 'Form 941 worksheet — Q2 2026', url: '/api/federal-forms/941/2026/2' },
            { label: 'Form 941 worksheet — Q3 2026', url: '/api/federal-forms/941/2026/3' },
            { label: 'Form 941 worksheet — Q4 2026', url: '/api/federal-forms/941/2026/4' },
            { label: 'Form 940 worksheet — 2026 FUTA', url: '/api/federal-forms/940/2026' },
          ].map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener"
              className="border rounded p-3 bg-white hover:bg-blue-50 text-sm block"
            >
              <div className="font-medium">{l.label}</div>
              <div className="text-xs text-gray-500 mt-1">Opens PDF (DRAFT — for reference only)</div>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
        <h3 className="font-semibold text-yellow-900">⚠️ Important — DRAFT PDFs Only</h3>
        <p className="mt-1 text-yellow-900">
          The PDFs AURA generates are <strong>drafts for your reference</strong>. They are NOT
          scannable official forms. For actual filing, you must:
        </p>
        <ul className="list-disc ml-6 mt-2 text-yellow-900">
          <li>Order official scannable forms at <a href="https://www.irs.gov/orderforms" target="_blank" rel="noopener" className="underline">https://www.irs.gov/orderforms</a> (free, 800-829-3676), OR</li>
          <li>E-file W-2 via <a href="https://www.ssa.gov/bso" target="_blank" rel="noopener" className="underline">SSA BSO</a> (free), OR</li>
          <li>E-file 1099s via <a href="https://www.irs.gov/ein-responsible-party" target="_blank" rel="noopener" className="underline">IRS FIRE</a> (free), OR</li>
          <li>E-file 941/940/944 via <a href="https://www.irs.gov/efile" target="_blank" rel="noopener" className="underline">IRS e-file</a> (free)</li>
        </ul>
        <p className="mt-2 text-xs text-yellow-800">
          Self-printed PDFs are NOT scannable and may incur penalty. AURA Computing Inc. is not
          a registered e-file provider.
        </p>
      </section>
    </div>
  );
}
