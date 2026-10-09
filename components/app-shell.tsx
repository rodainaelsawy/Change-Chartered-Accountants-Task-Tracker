'use client'

import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Menu,
  Plus,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type NavItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: { n: number; tone: 'red' | 'amber'; title: string } }

/**
 App frame: sidebar on the right (desktop) / slide-in menu (phones) + top bar.
 The sidebar footer (user, logout) and the top bar actions are rendered on the server and passed in.
*/
export function AppShell({
  isAdmin,
  orgName,
  overdue,
  toReview,
  footer,
  topbar,
  children,
}: {
  isAdmin: boolean
  orgName: string
  overdue: number
  toReview: number
  footer: React.ReactNode
  topbar: React.ReactNode
  children: React.ReactNode
}) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const items: NavItem[] = [
    {
      href: '/',
      label: 'لوحة المتابعة',
      icon: LayoutDashboard,
      match: (p) => p === '/',
      badge: toReview ? { n: toReview, tone: 'amber', title: 'بانتظار مراجعتك' } : undefined,
    },
    {
      href: '/tasks',
      label: 'المهام',
      icon: ListTodo,
      match: (p) => p.startsWith('/tasks') || p.startsWith('/templates'),
      badge: overdue ? { n: overdue, tone: 'red', title: 'مهام متأخرة' } : undefined,
    },
    { href: '/calendar', label: 'التقويم', icon: CalendarDays, match: (p) => p.startsWith('/calendar') },
    { href: '/companies', label: 'الشركات', icon: Building2, match: (p) => p.startsWith('/companies') || p.startsWith('/import') },
    ...(isAdmin
      ? [
          { href: '/workload', label: 'توزيع العمل', icon: Users, match: (p: string) => p.startsWith('/workload') },
          { href: '/reports', label: 'التقارير', icon: BarChart3, match: (p: string) => p.startsWith('/reports') },
        ]
      : []),
    { href: '/settings', label: isAdmin ? 'الإعدادات والفريق' : 'الإعدادات', icon: Settings, match: (p) => p.startsWith('/settings') },
  ]

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/" title="لوحة المتابعة">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={orgName} width={600} height={150} className="logo h-11 w-auto" />
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="إغلاق القائمة">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav aria-label="القائمة الرئيسية" className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((it) => {
          const active = it.match(path)
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${
                active ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">{it.label}</span>
              {it.badge && (
                <span
                  title={it.badge.title}
                  className={`min-w-6 rounded-full px-1.5 text-center text-xs font-bold leading-6 ${
                    it.badge.tone === 'red' ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'
                  }`}
                >
                  {it.badge.n > 99 ? '99+' : it.badge.n}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">{footer}</div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-slate-200 bg-white lg:block print:hidden">{sidebar}</aside>

      {/* Phone / tablet slide-in menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85%] bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ps-64 print:ps-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="فتح القائمة"
              aria-expanded={open}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="me-auto lg:hidden" title="لوحة المتابعة">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={orgName} width={600} height={150} className="logo h-8 w-auto" />
            </Link>
            {topbar}
          </div>
        </header>
        <main className="px-4 py-6 pb-24 lg:px-8 lg:pb-8 print:p-0">{children}</main>
        {['/', '/tasks', '/calendar'].includes(path) && (
          <Link
            href="/tasks/new"
            className="fixed bottom-5 end-5 z-20 flex items-center gap-2 rounded-full bg-brand-700 py-3.5 pe-5 ps-4 font-semibold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-800 lg:hidden print:hidden"
          >
            <Plus className="h-5 w-5" /> مهمة جديدة
          </Link>
        )}
      </div>
    </div>
  )
}
