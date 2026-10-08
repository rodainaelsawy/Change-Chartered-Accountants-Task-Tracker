import Link from 'next/link'
import { after } from 'next/server'
import { logout } from '@/app/actions/auth'
import { NavLinks } from '@/components/nav-links'
import { requireSession } from '@/lib/auth'
import { one } from '@/lib/db'
import { runDaily } from '@/lib/reminders'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireSession()

  // First visit of the day creates today's reminders; the digest email is sent after the response.
  await runDaily(org, { deferEmail: (fn) => after(fn) })

  const { n: unread } = (await one<{ n: number }>(
    'select count(*)::int as n from notifications where user_id = $1 and read_at is null',
    [user.id],
  ))!

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 font-bold text-white">✓</span>
            <span className="font-bold text-slate-900">{org.name}</span>
          </Link>
          <div className="ms-auto flex shrink-0 items-center gap-1 md:order-last">
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="التنبيهات"
              title="التنبيهات"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <Link href="/settings" className="hidden rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 md:block">
              {user.full_name || user.email}
            </Link>
            <form action={logout}>
              <button className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" title="تسجيل الخروج">
                خروج
              </button>
            </form>
          </div>
          <NavLinks isAdmin={user.role === 'admin'} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
