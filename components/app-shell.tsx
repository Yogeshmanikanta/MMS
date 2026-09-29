'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Coffee, Receipt, Users, Tag, LogOut, RefreshCw, CloudOff, Check, HardDrive } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/use-store';
import { localDb } from '@/lib/db';
import { formatTime } from '@/lib/dates';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/today', label: 'Today', icon: CalendarCheck },
  { href: '/guests', label: 'Guests', icon: Coffee },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/prices', label: 'Prices', icon: Tag }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh md:flex">
      {/* Cover / spine: navigation on tablet and desktop */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col bg-ink text-white md:flex md:w-[5.5rem] lg:w-60">
        <div className="px-3 pb-6 pt-6 lg:px-6">
          <p className="hidden text-lg font-bold leading-tight lg:block">Hostel Mess</p>
          <p className="text-center text-lg font-bold lg:hidden" aria-hidden>
            HM
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-2 lg:px-3" aria-label="Main">
          {NAV.map(item => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs font-semibold transition-colors',
                  'lg:flex-row lg:gap-3 lg:px-3 lg:text-base',
                  active ? 'bg-white text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-white/10 px-3 py-4 lg:px-5">
          <SyncStatusLine variant="dark" />
          <div className="flex items-center justify-between gap-2">
            <p className="hidden truncate text-sm text-white/70 lg:block">{user?.name || 'Admin'}</p>
            <button
              type="button"
              onClick={logout}
              className="mx-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white lg:mx-0"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only lg:not-sr-only">Sign out</span>
            </button>
          </div>
          <p className="hidden text-xs text-white/40 lg:block">Built by NYTLabs</p>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/95 px-4 backdrop-blur md:hidden">
        <p className="font-bold">Hostel Mess</p>
        <MobileMenu onLogout={logout} />
      </header>

      <main className="min-w-0 flex-1 md:border-l-[3px] md:border-double md:border-sky">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8 lg:px-10">{children}</div>
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-sheet pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map(item => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold',
                active ? 'text-royal' : 'text-ink-3'
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MobileMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
        <SyncDot />
        <span className="text-ink-2">Account</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 space-y-3 rounded-lg bg-sheet p-4 shadow-float">
            <SyncStatusLine variant="light" />
            <button type="button" onClick={onLogout} className="btn btn-secondary btn-sm w-full">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SyncDot() {
  const status = useStore(db => db.getSyncStatus());
  const color =
    status.state === 'error' ? 'bg-away' : status.state === 'offline' || status.pending ? 'bg-marker-ink' : 'bg-royal';
  return <span className={cn('h-2 w-2 rounded-full', color)} aria-hidden />;
}

export function SyncStatusLine({ variant }: { variant: 'dark' | 'light' }) {
  const status = useStore(db => db.getSyncStatus());
  const muted = variant === 'dark' ? 'text-white/65' : 'text-ink-2';
  const iconCls = 'h-4 w-4 shrink-0';

  let icon: React.ReactNode;
  let text: string;
  let retry = false;

  if (status.state === 'local') {
    icon = <HardDrive className={iconCls} />;
    text = 'Saved on this device';
  } else if (status.state === 'syncing') {
    icon = <RefreshCw className={cn(iconCls, 'animate-spin')} />;
    text = 'Syncing';
  } else if (status.state === 'offline') {
    icon = <CloudOff className={iconCls} />;
    text = status.pending ? `Offline, ${status.pending} to send` : 'Offline';
  } else if (status.state === 'error') {
    icon = <CloudOff className={cn(iconCls, variant === 'dark' ? 'text-[#ff9a93]' : 'text-away')} />;
    text = status.pending ? `${status.pending} not sent` : 'Sync failed';
    retry = true;
  } else if (status.pending) {
    icon = <RefreshCw className={iconCls} />;
    text = `${status.pending} to send`;
  } else {
    icon = <Check className={iconCls} />;
    text = status.lastSyncedAt ? `Synced ${formatTime(status.lastSyncedAt)}` : 'Synced';
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', muted)} title={status.error}>
      {icon}
      <span className="hidden truncate lg:inline max-md:inline">{text}</span>
      {retry && (
        <button
          type="button"
          onClick={() => localDb.syncNow()}
          className={cn('ml-auto hidden font-semibold underline underline-offset-2 lg:inline max-md:inline', variant === 'dark' ? 'text-white' : 'text-royal')}
        >
          Retry
        </button>
      )}
    </div>
  );
}
