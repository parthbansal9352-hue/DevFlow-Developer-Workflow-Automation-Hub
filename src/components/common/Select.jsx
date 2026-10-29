import React from 'react';

export function Select({
  label,
  id,
  options = [],
  error,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        className={`w-full px-3.5 py-2 bg-slate-900 border rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
          error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 hover:border-slate-600'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
