import Link from 'next/link'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import { Suspense } from 'react'
import { logout } from '@/app/actions/auth'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { NavTracker } from '@/components/back-button'
import { AppShell } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import { Bell, CircleHelp, LogOut, Search } from 'lucide-react'
import { todayIn } from '@/lib/dates'
import { OPEN_SQL, ROLE_LABEL } from '@/lib/labels'
import { visibleTo } from '@/lib/permissions'
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

  const today = todayIn(org.timezone)
  const admin = user.role === 'admin'
  const counts = (await one<{ unread: number; overdue: number; to_review: number }>(
    `select
       (select count(*)::int from notifications where user_id = $1 and read_at is null) as unread,
       (select count(*)::int from tasks t where t.org_id = $2 and t.status in ${OPEN_SQL} and t.deadline < $3
           and ${visibleTo(user, '$1')}) as overdue,
       (select count(*)::int from tasks t where t.org_id = $2 and t.status = 'review'
           and (${admin} or exists (select 1 from task_followers f where f.task_id = t.id and f.user_id = $1))) as to_review`,
    [user.id, org.id, today],
  ))!
  const unread = counts.unread

  return (
    <ToastProvider>
      <AppShell
        isAdmin={admin}
        orgName={org.name}
        overdue={counts.overdue}
        toReview={counts.to_review}
        userName={user.full_name || user.email}
        roleLabel={ROLE_LABEL[user.role]}
        initialCollapsed={(await cookies()).get('sidebar')?.value === 'collapsed'}
        logout={
          <form action={logout}>
            <SubmitButton className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-700" title="تسجيل الخروج" aria-label="تسجيل الخروج">
              <LogOut className="h-5 w-5" />
            </SubmitButton>
          </form>
        }
        topbar={
          <div className="flex flex-1 items-center justify-end gap-1 lg:justify-between">
            {/* Global search (H6 recognition, H7 efficiency). Shortcut: "/" */}
            <form action="/search" className="hidden w-full max-w-xl lg:block" role="search">
              <label className="relative block">
                <span className="sr-only">بحث</span>
                <input
                  id="global-search"
                  name="q"
                  placeholder="بحث في الشركات والمهام…  ( / )"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pe-3 ps-10 text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>
            </form>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Link href="/search" className={`${iconBtn} lg:hidden`} aria-label="بحث" title="بحث">
                <Search className="h-5 w-5" />
              </Link>
              <Link href="/notifications" className={iconBtn} aria-label={`التنبيهات (${unread} غير مقروءة)`} title="التنبيهات">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              <Link href="/help" className={iconBtn} aria-label="المساعدة" title="المساعدة ودليل الاستخدام ( ? )">
                <CircleHelp className="h-5 w-5" />
              </Link>
              <ThemeToggle className={iconBtn} />
            </div>
          </div>
        }
      >
        {children}
      </AppShell>
      <Suspense>
        <FlashFromUrl />
      </Suspense>
      <KeyboardShortcuts />
      <NavTracker />
    </ToastProvider>
  )
}
