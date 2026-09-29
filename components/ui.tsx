'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getMonthName } from '@/lib/dates';

// ---------------------------------------------------------------------------
// Page header: title on the left, actions on the right. No eyebrows.
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
  className
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form field wrapper
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-away">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

// ---------------------------------------------------------------------------
// Segmented control (tabs / filters)
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  label
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-md border border-sky bg-sheet p-0.5">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[5px] font-semibold transition-colors',
              size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4',
              active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-sky-wash'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month stepper: ‹ September 2026 ›
// ---------------------------------------------------------------------------

export function MonthStepper({
  year,
  month,
  onChange,
  max
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  max?: { year: number; month: number };
}) {
  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  };
  const atMax = max ? year * 12 + month >= max.year * 12 + max.month : false;
  return (
    <div className="inline-flex items-center rounded-md border border-sky bg-sheet">
      <button type="button" className="btn btn-ghost h-10 w-10 px-0" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[9.5rem] px-2 text-center font-semibold">
        {getMonthName(month)} {year}
      </span>
      <button
        type="button"
        className="btn btn-ghost h-10 w-10 px-0"
        onClick={() => shift(1)}
        disabled={atMax}
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet: slides in from the right on wide screens, up from the bottom on phones.
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md'
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first input for fast entry.
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]');
      el?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portal to <body> so parent spacing/stacking (e.g. space-y-*) can't offset the overlay.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30 animate-[fade_150ms_ease-out]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute flex flex-col bg-sheet shadow-float',
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl animate-[rise_200ms_ease-out]',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:rounded-none sm:rounded-l-xl sm:animate-[slide_200ms_ease-out]',
          width === 'lg' ? 'sm:w-[40rem]' : 'sm:w-[28rem]'
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost h-10 w-10 px-0" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-rule px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-ink/30" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-xl bg-sheet p-5 shadow-float">
        <h2 className="text-lg font-bold">{title}</h2>
        {body && <div className="mt-2 text-ink-2">{body}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            className={cn('btn', tone === 'danger' ? 'bg-away text-white hover:bg-away/90' : 'btn-primary')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Empty state — a sentence and an action, nothing more.
// ---------------------------------------------------------------------------

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-sky px-6 py-10 text-center text-ink-2">
      <div>{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
