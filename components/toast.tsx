'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, opts?: number | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, opts?: number | ToastOptions) => {
    const o: ToastOptions = typeof opts === 'number' ? { duration: opts } : opts || {};
    const id = nextId++;
    // Newest replaces older ones beyond three so the stack never covers the page.
    setToasts(prev => [...prev.slice(-2), { id, type, title, message, ...o }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
      >
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const duration = toast.duration ?? (toast.action ? 6000 : 3500);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(t);
  }, [paused, duration, toast.id, onDismiss]);

  const isError = toast.type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg px-4 py-3 shadow-float animate-[rise_180ms_ease-out]',
        isError ? 'bg-away text-white' : 'bg-ink text-white'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-sm text-white/80">{toast.message}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="-my-1 shrink-0 rounded-md px-3 py-1.5 font-semibold text-sky hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-my-1 -mr-2 shrink-0 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
