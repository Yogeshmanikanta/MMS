import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-zinc-200 rounded-md bg-white overflow-hidden shadow-sm">
      <div className="bg-zinc-50 border-b border-zinc-200 py-3 px-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-zinc-200 rounded animate-pulse flex-1" />
        ))}
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="py-3 px-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-zinc-100 rounded animate-pulse flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 rounded-md border border-zinc-200 bg-white space-y-3">
      <div className="h-4 bg-zinc-200 rounded animate-pulse w-1/3" />
      <div className="h-8 bg-zinc-100 rounded animate-pulse w-2/3" />
    </div>
  );
}
