'use client';
import React from 'react';
import { UseFormRegister, FieldError, FieldValues, Path } from 'react-hook-form';

// ─── Form Field Wrapper ───────────────────────────────────────────────────────
export function FormField({ label, error, required, children, hint }: {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="form-error">{error.message}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input<T extends FieldValues>({
  register,
  name,
  label,
  type = 'text',
  placeholder,
  error,
  required,
  hint,
  disabled,
}: {
  register: UseFormRegister<T>;
  name: Path<T>;
  label: string;
  type?: string;
  placeholder?: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`form-input ${error ? 'border-red-300 focus:ring-red-300' : ''} ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
      />
    </FormField>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select<T extends FieldValues>({
  register,
  name,
  label,
  options,
  placeholder,
  error,
  required,
  disabled,
}: {
  register: UseFormRegister<T>;
  name: Path<T>;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: FieldError;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} error={error} required={required}>
      <select
        {...register(name)}
        disabled={disabled}
        className={`form-input ${error ? 'border-red-300 focus:ring-red-300' : ''} ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FormField>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea<T extends FieldValues>({
  register,
  name,
  label,
  placeholder,
  rows = 3,
  error,
  required,
}: {
  register: UseFormRegister<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  rows?: number;
  error?: FieldError;
  required?: boolean;
}) {
  return (
    <FormField label={label} error={error} required={required}>
      <textarea
        {...register(name)}
        placeholder={placeholder}
        rows={rows}
        className={`form-input resize-none ${error ? 'border-red-300 focus:ring-red-300' : ''}`}
      />
    </FormField>
  );
}

// ─── Form Grid ────────────────────────────────────────────────────────────────
export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const colStyles = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' };
  return <div className={`grid ${colStyles[cols]} gap-4`}>{children}</div>;
}

// ─── Form Actions ─────────────────────────────────────────────────────────────
export function FormActions({
  onCancel,
  submitLabel = 'Save',
  loading = false,
  cancelLabel = 'Cancel',
}: {
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
  cancelLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
        {cancelLabel}
      </button>
      <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {submitLabel}
      </button>
    </div>
  );
}

// ─── Currency Display ─────────────────────────────────────────────────────────
export function Currency({ amount, className = '' }: { amount: number | string; className?: string }) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (
    <span className={className}>
      ₹ {isNaN(num) ? '0' : num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}

// ─── Date Display ─────────────────────────────────────────────────────────────
export function DateDisplay({ date, format = 'date' }: { date: string | Date | null | undefined; format?: 'date' | 'datetime' | 'relative' }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const d = new Date(date);
  if (format === 'datetime') {
    return <span>{d.toLocaleDateString('en-IN')} {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>;
  }
  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return <span className="text-green-600 font-medium">Today</span>;
    if (days === 1) return <span className="text-yellow-600 font-medium">Yesterday</span>;
    if (days < 7) return <span className="text-orange-500 font-medium">{days}d ago</span>;
    return <span>{d.toLocaleDateString('en-IN')}</span>;
  }
  return <span>{d.toLocaleDateString('en-IN')}</span>;
}

// ─── Action Menu ──────────────────────────────────────────────────────────────
export function ActionButton({
  onClick,
  variant = 'ghost',
  size = 'sm',
  children,
  className = '',
  disabled = false,
}: {
  onClick: () => void;
  variant?: 'ghost' | 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    ghost: 'text-gray-600 hover:bg-gray-100',
    primary: 'bg-gold-500 text-white hover:bg-gold-600',
    danger: 'text-red-600 hover:bg-red-50',
    success: 'text-green-600 hover:bg-green-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
