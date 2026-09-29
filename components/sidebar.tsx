'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  UserCheck, 
  Receipt, 
  Coffee, 
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  DollarSign,
  Upload,
  LogOut
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const mainNavItems = [
    {
      title: 'Daily Attendance',
      href: '/attendance',
      icon: ClipboardCheck,
      badge: 'Daily'
    },
    {
      title: 'Monthly Bills',
      href: '/monthly-bills',
      icon: Receipt,
      badge: 'Bills'
    },
    {
      title: 'Guest Ledger',
      href: '/guest-ledger',
      icon: Coffee,
      badge: 'Guests'
    },
    {
      title: 'Cost Management',
      href: '/cost-management',
      icon: DollarSign,
      badge: 'Prices'
    },
  ];

  const secondaryNavItems = [
    {
      title: 'Dashboard Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Student Directory',
      href: '/students',
      icon: Users,
    },
    {
      title: 'Import Student Data',
      href: '/students/import',
      icon: Upload,
      badge: 'JSON'
    },
    {
      title: 'Rapid Roll Lookup',
      href: '/in-charge',
      icon: UserCheck,
    },
    {
      title: 'Monthly Excel Reports',
      href: '/reports',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-300 flex flex-col border-r border-zinc-800 shrink-0 h-screen sticky top-0">
      {/* Branding Header: NYTLabs Large & MMS Below */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">NYTLabs</h1>
            <p className="text-xs font-extrabold text-blue-400 tracking-wider uppercase mt-0.5">MMS</p>
          </div>
        </div>
      </div>

      {/* Admin Status Pill */}
      <div className="px-3 py-2 mx-3 mt-3 bg-zinc-800/60 rounded-md border border-zinc-700/50 flex items-center justify-between text-xs font-medium text-zinc-300">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate font-semibold text-zinc-200">Admin Portal</span>
        </div>
        <button
          onClick={() => logout()}
          className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Core Operations */}
        <div className="space-y-1">
          <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">
            Main Operations
          </div>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/guest-ledger' && pathname === '/tokens') || (item.href === '/monthly-bills' && pathname === '/billing');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-sm'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Other Management Sections */}
        <div className="space-y-1">
          <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            System Modules
          </div>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold border border-zinc-700/80 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info & Footer Credit */}
      <div className="p-3 border-t border-zinc-800 space-y-2 bg-zinc-900/90">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name || 'Chief Warden / Admin'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email || 'admin@collegemess.edu'}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 text-center">
          <p className="text-[10px] text-zinc-500 font-medium">
            Developed by <span className="text-zinc-400 font-semibold">NYTLabs</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
