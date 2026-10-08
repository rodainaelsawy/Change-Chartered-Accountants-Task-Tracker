'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname()
  const links = [
    { href: '/', label: 'لوحة المتابعة', match: (p: string) => p === '/' },
    { href: '/tasks', label: 'المهام', match: (p: string) => p.startsWith('/tasks') },
    { href: '/companies', label: 'الشركات', match: (p: string) => p.startsWith('/companies') || p.startsWith('/import') },
    { href: '/settings', label: isAdmin ? 'الإعدادات والفريق' : 'الإعدادات', match: (p: string) => p.startsWith('/settings') },
  ]
  return (
    <nav className="-mx-1 flex w-full min-w-0 gap-1 overflow-x-auto md:w-auto md:flex-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
            l.match(path) ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
