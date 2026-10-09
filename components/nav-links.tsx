'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  // Reports and the team workload are for admins only.
  const path = usePathname()
  const links = [
    { href: '/', label: 'لوحة المتابعة', match: (p: string) => p === '/' },
    { href: '/tasks', label: 'المهام', match: (p: string) => p.startsWith('/tasks') || p.startsWith('/templates') },
    { href: '/calendar', label: 'التقويم', match: (p: string) => p.startsWith('/calendar') },
    { href: '/companies', label: 'الشركات', match: (p: string) => p.startsWith('/companies') || p.startsWith('/import') },
    ...(isAdmin
      ? [
          { href: '/workload', label: 'توزيع العمل', match: (p: string) => p.startsWith('/workload') },
          { href: '/reports', label: 'التقارير', match: (p: string) => p.startsWith('/reports') },
        ]
      : []),
    { href: '/settings', label: isAdmin ? 'الإعدادات والفريق' : 'الإعدادات', match: (p: string) => p.startsWith('/settings') },
  ]
  return (
    <nav aria-label="القائمة الرئيسية" className="-mx-1 flex w-full min-w-0 gap-1 overflow-x-auto lg:w-auto lg:flex-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.match(path) ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
            l.match(path) ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
