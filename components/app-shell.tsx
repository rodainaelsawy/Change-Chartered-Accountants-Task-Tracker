'use client'

import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Menu,
  PanelRightClose,
  PanelRightOpen,
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
  userName,
  roleLabel,
  logout,
  initialCollapsed,
  topbar,
  children,
}: {
  isAdmin: boolean
  orgName: string
  overdue: number
  toReview: number
  userName: string
  roleLabel: string
  /** The logout form (server action), rendered on the server. */
  logout: React.ReactNode
  /** Desktop sidebar folded to icons (cookie "sidebar=collapsed", read on the server to avoid a flash). */
  initialCollapsed: boolean
  topbar: React.ReactNode
  children: React.ReactNode
}) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `sidebar=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`
  }
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

  /** Sidebar content; `rail` = folded desktop version (icons only, names as tooltips). */
  const sidebar = (rail: boolean) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center pb-4 pt-5 ${rail ? 'justify-center px-2' : 'justify-between px-5'}`}>
        <Link href="/" title="لوحة المتابعة">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rail ? '/logo-mark.png' : '/logo.png'}
            alt={orgName}
            width={rail ? 150 : 600}
            height={150}
            className={`logo w-auto ${rail ? 'h-10' : 'h-11'}`}
          />
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="إغلاق القائمة">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav aria-label="القائمة الرئيسية" className={`flex-1 space-y-1 overflow-y-auto ${rail ? 'px-2' : 'px-3'}`}>
        {items.map((it) => {
          const active = it.match(path)
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              aria-label={rail ? it.label + (it.badge ? ` (${it.badge.n} ${it.badge.title})` : '') : undefined}
              title={rail ? it.label : undefined}
              className={`relative flex items-center gap-3 rounded-lg py-2.5 text-[0.95rem] font-medium transition-colors ${
                rail ? 'justify-center px-0' : 'px-3'
              } ${active ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!rail && <span className="flex-1">{it.label}</span>}
              {it.badge && (
                <span
                  title={it.badge.title}
                  className={`rounded-full text-center font-bold ${
                    rail ? 'absolute -top-1 end-0.5 min-w-5 px-1 text-[10px] leading-5' : 'min-w-6 px-1.5 text-xs leading-6'
                  } ${it.badge.tone === 'red' ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'}`}
                >
                  {it.badge.n > 99 ? '99+' : it.badge.n}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className={`border-t border-slate-200 p-3 ${rail ? 'flex flex-col items-center gap-1 px-2' : 'flex items-center gap-2'}`}>
        <Link
          href="/settings"
          className={`flex min-w-0 items-center gap-2 rounded-lg p-2 hover:bg-slate-100 ${rail ? '' : 'flex-1'}`}
          title={rail ? `${userName} · ${roleLabel}` : 'بياناتي والإعدادات'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">
            {userName.trim().charAt(0)}
          </span>
          {!rail && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">{userName}</span>
              <span className="block text-xs text-slate-500">{roleLabel}</span>
            </span>
          )}
        </Link>
        {logout}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 start-0 z-30 hidden border-e border-slate-200 bg-white transition-[width] duration-200 lg:block print:hidden ${
          collapsed ? 'w-[4.75rem]' : 'w-64'
        }`}
      >
        {sidebar(collapsed)}
      </aside>

      {/* Phone / tablet slide-in menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85%] bg-white shadow-xl">{sidebar(false)}</aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 print:ps-0 ${collapsed ? 'lg:ps-[4.75rem]' : 'lg:ps-64'}`}>
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
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:block"
              aria-label={collapsed ? 'إظهار القائمة الجانبية' : 'طي القائمة الجانبية'}
              title={collapsed ? 'إظهار القائمة الجانبية' : 'طي القائمة الجانبية'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
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
