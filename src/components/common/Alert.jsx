import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Alert({ variant = 'info', title, message, className = '' }) {
  const icons = {
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  };

  const bgStyles = {
    info: 'bg-cyan-950/40 border-cyan-800/50 text-cyan-200',
    success: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
    error: 'bg-rose-950/40 border-rose-800/50 text-rose-200',
  };

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${bgStyles[variant] || bgStyles.info} ${className}`}>
      {icons[variant] || icons.info}
      <div>
        {title && <h5 className="font-medium text-slate-100 mb-0.5">{title}</h5>}
        {message && <p className="text-xs text-slate-300 leading-relaxed">{message}</p>}
      </div>
    </div>
  );
}
