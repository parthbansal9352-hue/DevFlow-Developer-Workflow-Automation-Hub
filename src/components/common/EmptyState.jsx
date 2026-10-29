import React from 'react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center glass-card rounded-xl border border-dashed border-slate-700/80 ${className}`}
    >
      {Icon && (
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-full mb-3 text-indigo-400">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-base font-medium text-slate-200 mb-1">{title}</h4>
      {description && <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
