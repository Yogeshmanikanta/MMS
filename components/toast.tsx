'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {}
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — fixed top-right overlay */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNotification({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />
  };

  const bgMap: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200 shadow-emerald-100/50',
    error: 'bg-red-50 border-red-200 shadow-red-100/50',
    info: 'bg-blue-50 border-blue-200 shadow-blue-100/50',
    warning: 'bg-amber-50 border-amber-200 shadow-amber-100/50'
  };

  const titleColorMap: Record<ToastType, string> = {
    success: 'text-emerald-900',
    error: 'text-red-900',
    info: 'text-blue-900',
    warning: 'text-amber-900'
  };

  const progressBarMap: Record<ToastType, string> = {
    success: 'bg-emerald-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    warning: 'bg-amber-400'
  };

  return (
    <div
      className={`
        pointer-events-auto rounded-lg border p-3.5 shadow-lg backdrop-blur-sm
        transition-all duration-300 ease-out
        ${bgMap[toast.type]}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${titleColorMap[toast.type]}`}>{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-zinc-200/60 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Animated progress bar */}
      <div className="mt-2.5 h-[3px] rounded-full bg-zinc-200/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${progressBarMap[toast.type]}`}
          style={{
            animation: `toast-progress ${toast.duration || 4000}ms linear forwards`
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
