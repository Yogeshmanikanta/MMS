'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Field } from '@/components/ui';

const LAST_USER_KEY = 'mms_last_username';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/today');
  }, [isAuthenticated, isLoading, router]);

  // Remember the username so staff only type the password.
  useEffect(() => {
    try {
      setUsername(localStorage.getItem(LAST_USER_KEY) || '');
    } catch {}
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (res.success) {
      try {
        localStorage.setItem(LAST_USER_KEY, username.trim());
      } catch {}
      router.replace('/today');
    } else {
      setError(res.message || 'That username and password don’t match.');
    }
  };

  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col justify-between bg-ink px-6 py-8 text-white md:px-12 md:py-14">
        <div>
          <p className="text-2xl font-bold">Hostel Mess</p>
          <p className="mt-2 max-w-xs text-white/70">Attendance, guest entries and monthly bills for the hostel mess.</p>
        </div>
        <p className="mt-10 hidden text-sm text-white/45 md:block">Built by NYTLabs</p>
      </div>

      <div className="flex items-start justify-center px-6 py-10 md:items-center md:px-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" noValidate>
          <h1 className="text-2xl font-bold">Sign in</h1>

          <Field label="Username" htmlFor="username">
            <input
              id="username"
              className="field"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus={!username}
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                className="field pr-12"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus={Boolean(username)}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sky-wash hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>

          {error && (
            <p role="alert" className="rounded-md bg-away-wash px-3 py-2.5 text-away">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? 'Signing in' : 'Sign in'}
          </button>

          <p className="pt-2 text-sm text-ink-3">
            Student?{' '}
            <Link href="/student-self" className="font-semibold text-royal underline-offset-2 hover:underline">
              Check your meals
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
