import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('admin@aura.local');
  const [password, setPassword] = useState('admin');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setAuth(res.user, res.token);
      navigate('/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white text-2xl font-bold mb-4">A</div>
          <h1 className="text-3xl font-bold text-slate-900">AURA Accounting</h1>
          <p className="text-slate-500 mt-1">W-2, 1099, and full accounting for your team</p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-5">Welcome back. Use the default admin or your team credentials.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-5 text-sm text-slate-500 text-center">
            New here?{' '}
            <Link to="/register" className="text-brand-600 hover:underline font-medium">
              Create your company
            </Link>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400 mt-6">
          First-run default: <code>admin@aura.local</code> / <code>admin</code>
        </div>
      </div>
    </div>
  );
}
