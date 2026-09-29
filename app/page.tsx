'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) router.replace(isAuthenticated ? '/today' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return <div className="min-h-dvh bg-paper" />;
}
