'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Footer } from '@/components/footer';
import { Building2, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, KeyRound, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState('NYTlabs');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your admin username.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password.trim());
      if (result.success) {
        router.push('/dashboard');
      } else {
        setErrorMessage(result.message || 'Invalid username or password.');
      }
    } catch (err) {
      setErrorMessage('An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="font-medium">Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8 shadow-sm space-y-6">
          
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">NYTLabs</h1>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">MMS — Admin Portal</p>
            </div>
            <p className="text-xs text-zinc-500 pt-1">
              Canteen & Hostel Mess Management System
            </p>
          </div>

          {/* Admin Security Banner */}
          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs space-y-1">
            <div className="flex items-center gap-2 text-zinc-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Administrator Sign In</span>
            </div>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Restricted portal for wardens & canteen managers to administer daily attendance, monthly billing, guest ledger, and cost tariffs.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 block">Username *</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none z-10" />
                <input
                  type="text"
                  required
                  placeholder="e.g. NYTlabs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-base input-with-icon h-10 text-xs"
                />
              </div>
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 block">Admin Password *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base input-with-icon pr-10 h-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button with Loading Spinner */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Admin Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
      <Footer />
    </div>
  );
}
