import Link from 'next/link'
import { after } from 'next/server'
import { Suspense } from 'react'
import { logout } from '@/app/actions/auth'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { NavLinks } from '@/components/nav-links'
import { SubmitButton } from '@/components/submit-button'
import { FlashFromUrl, ToastProvider } from '@/components/toast'
import { requireSession } from '@/lib/auth'
import { one } from '@/lib/db'
import { runDaily } from '@/lib/reminders'

const iconBtn = 'relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireSession()

  // First visit of the day creates today's reminders; the digest email is sent after the response.
  await runDaily(org, { deferEmail: (fn) => after(fn) })

  const { n: unread } = (await one<{ n: number }>(
    'select count(*)::int as n from notifications where user_id = $1 and read_at is null',
    [user.id],
  ))!

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:px-8">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none" title="لوحة المتابعة">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 font-bold text-white">✓</span>
              <span className="truncate font-bold text-slate-900">{org.name}</span>
            </Link>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:order-last lg:ms-auto">
              {/* Global search (H6 recognition, H7 efficiency). Shortcut: "/" */}
              <form action="/search" className="hidden xl:block" role="search">
                <label className="relative block">
                  <span className="sr-only">بحث</span>
                  <input
                    id="global-search"
                    name="q"
                    placeholder="بحث في الشركات والمهام…  ( / )"
                    className="w-72 rounded-lg border border-slate-300 bg-slate-50 py-2 pe-3 ps-9 text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
                  />
                  <svg className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </label>
              </form>
              <Link href="/search" className={`${iconBtn} xl:hidden`} aria-label="بحث" title="بحث">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </Link>
              <Link href="/notifications" className={iconBtn} aria-label={`التنبيهات (${unread} غير مقروءة)`} title="التنبيهات">
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
              <Link href="/help" className={iconBtn} aria-label="المساعدة" title="المساعدة ودليل الاستخدام ( ? )">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-sm font-bold">؟</span>
              </Link>
              <Link href="/settings" className="hidden rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 md:block" title="بياناتي والإعدادات">
                {user.full_name || user.email}
              </Link>
              <form action={logout}>
                <SubmitButton className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-100" title="تسجيل الخروج">
                  خروج
                </SubmitButton>
              </form>
            </div>
            <NavLinks isAdmin={user.role === 'admin'} />
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 print:p-0">{children}</main>
      </div>
      <Suspense>
        <FlashFromUrl />
      </Suspense>
      <KeyboardShortcuts />
    </ToastProvider>
  )
}
