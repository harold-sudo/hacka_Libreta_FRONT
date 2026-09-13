import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const buttonVariants: Record<string, string> = {
  primary:
    'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-950/40 focus-visible:ring-violet-400',
  outline:
    'border border-white/15 bg-transparent text-slate-200 hover:border-white/30 hover:bg-white/5 focus-visible:ring-slate-300',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-rose-600/90 text-white hover:bg-rose-500 focus-visible:ring-rose-400',
}

const buttonSizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      <span>{children}</span>
    </button>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, className, ...props }: FieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        className={cn(
          'w-full rounded-xl border bg-[#0b101c] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:outline-none focus:ring-2',
          error
            ? 'border-rose-500/60 focus:ring-rose-400/50'
            : 'border-white/10 focus:border-violet-400/60 focus:ring-violet-400/40',
        )}
        {...props}
      />
      {error ? (
        <span className="block text-xs text-rose-400">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface StatusPillProps {
  tone: string
  children: ReactNode
  dot?: boolean
}

export function StatusPill({ tone, children, dot = true }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tone,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className ?? 'size-5')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

export function CodeText({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[0.8em] text-violet-300">
      {children}
    </code>
  )
}
