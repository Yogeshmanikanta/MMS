import React from 'react';
import { FolderOpen, SearchX, FileText } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconType?: 'search' | 'folder' | 'file';
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  iconType = 'folder'
}: EmptyStateProps) {
  const Icon = iconType === 'search' ? SearchX : iconType === 'file' ? FileText : FolderOpen;

  return (
    <div className="w-full border border-dashed border-zinc-300 rounded-md p-10 text-center bg-zinc-50/50 flex flex-col items-center justify-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-500">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-secondary text-xs mt-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
