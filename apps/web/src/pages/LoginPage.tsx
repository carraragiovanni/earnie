import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, setToken } from '../api';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = React.useState<'login' | 'signup'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await apiFetch<{ token: string }>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return res;
    },
    onSuccess: (data) => {
      setToken(data.token);
      nav('/');
    }
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 text-lg font-semibold">{mode === 'login' ? 'Log in' : 'Create account'}</div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Email</div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Password</div>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <div className="mt-1 text-xs text-neutral-500">Minimum 8 characters.</div>
          </label>

          {mutation.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {(mutation.error as Error).message}
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Working…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>

          <button
            className="w-full rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Create an account' : 'Use an existing account'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-neutral-500">
        API defaults to <code className="rounded bg-neutral-100 px-1">http://localhost:4000</code>
      </div>
    </div>
  );
}
