import Link from 'next/link'
import { isValidElement } from 'react'
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE, isOpen } from '@/lib/labels'
import { daysBetween, relativeDue } from '@/lib/dates'
import type { TaskPriority, TaskStatus } from '@/lib/types'

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50'

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800 disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60',
  ghost: 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100',
}

export function Card({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

/** Red asterisk shown next to mandatory field labels. */
export function RequiredMark() {
  return (
    <span className="ms-0.5 text-red-600" aria-hidden="true">
      *
    </span>
  )
}

/** Label + control. A control with the `required` attribute automatically gets a red asterisk. */
export function Field({
  label,
  hint,
  children,
  className = '',
  required,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
  /** Override the automatic detection; 'group' marks one field of an "at least one of" group. */
  required?: boolean | 'group'
}) {
  const auto = isValidElement<{ required?: boolean }>(children) && Boolean(children.props.required)
  const mark = required ?? auto
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {mark === true && <RequiredMark />}
        {mark === 'group' && <span className="ms-0.5 text-red-600" aria-hidden="true">*¹</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PriorityText({ priority }: { priority: TaskPriority }) {
  return <span className={`text-sm ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]}</span>
}

/** Urgency colour (FR-6.3): overdue red, due within 2 days amber, later neutral, done green. */
export function urgency(status: TaskStatus, deadline: string, today: string): 'overdue' | 'soon' | 'later' | 'closed' {
  if (!isOpen(status)) return 'closed'
  const n = daysBetween(today, deadline)
  if (n < 0) return 'overdue'
  if (n <= 2) return 'soon'
  return 'later'
}

export function DueText({ status, deadline, today }: { status: TaskStatus; deadline: string; today: string }) {
  const u = urgency(status, deadline, today)
  const cls = {
    overdue: 'text-red-700 font-semibold',
    soon: 'text-amber-700 font-medium',
    later: 'text-slate-500',
    closed: 'text-slate-400',
  }[u]
  return <span className={`text-xs ${cls}`}>{u === 'closed' ? '—' : relativeDue(deadline, today)}</span>
}

export const urgencyBorder = {
  overdue: 'border-r-4 border-r-red-500',
  soon: 'border-r-4 border-r-amber-400',
  later: 'border-r-4 border-r-transparent',
  closed: 'border-r-4 border-r-emerald-400',
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-12 text-center text-sm text-slate-500">{children}</div>
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const cls = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[kind]
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: number
  href: string
  tone: 'red' | 'amber' | 'sky' | 'emerald'
}) {
  const tones = {
    red: 'text-red-700 bg-red-50',
    amber: 'text-amber-700 bg-amber-50',
    sky: 'text-sky-700 bg-sky-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  }
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 inline-block rounded-lg px-3 py-1 text-3xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
    </Link>
  )
}

/** Breadcrumb trail above a page title (H3: always a clear way back). */
export function Crumbs({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="مسار الصفحة" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm print:hidden">
      {items.map((it, i) => (
        <span key={it.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">‹</span>}
          <Link href={it.href} className="text-brand-700 hover:underline">
            {it.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
