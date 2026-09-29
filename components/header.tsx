'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Calendar, ShieldCheck, LogOut } from 'lucide-react';
import { getTodayString } from '@/lib/db';

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const todayStr = getTodayString();

  return (
    <header className="h-14 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">{title}</h2>
        <span className="text-zinc-300">|</span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-zinc-100/80 px-2.5 py-1 rounded-md border border-zinc-200/60">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>Today: {todayStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="badge badge-neutral flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Admin / Warden
          </span>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-zinc-800 leading-none">{user?.name || 'Administrator'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
