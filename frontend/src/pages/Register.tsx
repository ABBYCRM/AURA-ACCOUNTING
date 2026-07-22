import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '', name: '', companyName: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: form,
      });
      setAuth(res.user, res.token);
      navigate('/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white text-2xl font-bold mb-4">A</div>
          <h1 className="text-3xl font-bold text-slate-900">Create your company</h1>
          <p className="text-slate-500 mt-1">Get your books set up in seconds</p>
        </div>
        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" value={form.name} onChange={upd('name')} required autoFocus />
            </div>
            <div>
              <label className="label">Company name</label>
              <input className="input" value={form.companyName} onChange={upd('companyName')} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={upd('email')} required />
            </div>
            <div>
              <label className="label">Password (min 4 chars)</label>
              <input type="password" className="input" value={form.password} onChange={upd('password')} minLength={4} required />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating…' : 'Create company'}
            </button>
          </form>
          <div className="mt-5 text-sm text-slate-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
