'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // Pages read from the browser store, so nothing renders until we're on the client and signed in.
  if (isLoading || !isAuthenticated) return <div className="min-h-dvh bg-paper" />;

  return <AppShell>{children}</AppShell>;
}
