import React from 'react'

export function Card({ title, right, children, className = '' }) {
  return (
    <div
      className={`bg-slate-900/70 border border-slate-800 rounded-xl p-4 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    ghost: 'bg-slate-800 hover:bg-slate-700 text-slate-200',
    danger: 'bg-rose-700/80 hover:bg-rose-600 text-white',
    subtle: 'bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant] || styles.primary} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block mb-3">
      <div className="text-xs text-slate-400 mb-1">
        {label}
        {hint && <span className="text-slate-500"> · {hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function Input({ className = '', ...rest }) {
  return (
    <input
      {...rest}
      className={`w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 ${className}`}
    />
  )
}

export function Textarea({ className = '', ...rest }) {
  return (
    <textarea
      {...rest}
      className={`w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 resize-y ${className}`}
    />
  )
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select
      {...rest}
      className={`w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 ${className}`}
    >
      {children}
    </select>
  )
}

export function Tag({ children, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600',
  }
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
        colors[color] || colors.slate
      }`}
    >
      {children}
    </span>
  )
}

export function Spinner({ text = '生成中…' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  )
}

export function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div className="text-sm text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg px-3 py-2">
      {msg}
    </div>
  )
}
