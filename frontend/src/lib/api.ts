import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'accountant' | 'viewer';
  companyId: number;
  companyName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: '' }),
    }),
    { name: 'aura-auth' }
  )
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; token?: string } = {}
): Promise<T> {
  const { token } = useAuth.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = options.token || token;
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401) {
    useAuth.getState().logout();
    if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
      location.href = '/login';
    }
    throw new ApiError('Not authenticated', 401);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed: ${res.status}`, res.status);
  }
  return data as T;
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}
