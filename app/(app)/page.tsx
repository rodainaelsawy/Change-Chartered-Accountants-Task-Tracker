import Link from 'next/link'
import { OPEN_SQL } from '@/lib/labels'
import { RememberFilters } from '@/components/remember-filters'
import { rememberedFilters } from '@/lib/remember-filters'
import { TaskList } from '@/components/task-list'
import { Card, PageHeader, StatCard, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { addDays, formatDate, formatDateTime, formatWeekday, startOfWeek, todayIn } from '@/lib/dates'
import { describeActivity } from '@/lib/activity'
import { TASK_SELECT, assignedTo } from '@/lib/queries'
import { canManage, isAdmin, visibleTo } from '@/lib/permissions'
import type { Task } from '@/lib/types'

export const metadata = { title: 'لوحة المتابعة' }

const OPEN = OPEN_SQL

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, org } = await requireSession()
  const remembered = await rememberedFilters('dashboard', await searchParams, ['scope'])
  const scope = remembered.get('scope')
  // Admins see the whole office and can switch to their own tasks; everyone else only sees their own tasks
  // (assigned / created / followed).
  const admin = isAdmin(user)
  const mine = admin ? scope === 'mine' : true
  const mineSql = (param: string) => `and ${admin ? (mine ? assignedTo(param) : `${param}::uuid is not null`) : visibleTo(user, param)}`
  const today = todayIn(org.timezone)
  const weekEnd = addDays(today, 7)

  const [stats, attention, companiesCount] = await Promise.all([
    one<{ overdue: number; today: number; week: number; done_week: number; open: number }>(
      `select
         count(*) filter (where status in ${OPEN} and deadline < $2)::int                  as overdue,
         count(*) filter (where status in ${OPEN} and deadline = $2)::int                  as today,
         count(*) filter (where status in ${OPEN} and deadline > $2 and deadline <= $3)::int as week,
         count(*) filter (where status = 'done' and completed_at >= $4::date)::int         as done_week,
         count(*) filter (where status in ${OPEN})::int                                    as open
       from tasks t where t.org_id = $1 ${mineSql('$5')}`,
      [org.id, today, weekEnd, startOfWeek(today), user.id],
    ),
    // "Needs attention": overdue first, then everything due in the next 7 days (FR-6.2)
    query<Task>(
      `${TASK_SELECT} where t.org_id = $1 and t.status in ${OPEN} and t.deadline <= $2 ${mineSql('$3')}
        order by t.deadline, t.priority desc limit 50`,
      [org.id, weekEnd, user.id],
    ),
    one<{ n: number }>('select count(*)::int as n from companies where org_id = $1 and archived_at is null', [org.id]),
  ])
  // Tasks waiting for this user's review (followers; admins see all of them).
  const toReview = await query<Task>(
    `${TASK_SELECT} where t.org_id = $1 and t.status = 'review'
       and ${admin ? '$2::uuid is not null' : 'exists (select 1 from task_followers f where f.task_id = t.id and f.user_id = $2)'}
     order by t.deadline limit 50`,
    [org.id, user.id],
  )
  const recent = await query<{
    id: string
    action: string
    details: Record<string, unknown>
    user_id: string | null
    who: string | null
    created_at: Date
    task_id: string
    title: string
    company_name: string
  }>(
    `select a.id, a.action, a.details, a.user_id, u.full_name as who, a.created_at, t.id as task_id, t.title, c.name as company_name
       from task_activity a join tasks t on t.id = a.task_id join companies c on c.id = t.company_id
       left join users u on u.id = a.user_id
      where a.org_id = $1 ${mineSql('$2')}
      order by a.created_at desc, a.id desc limit 12`,
    [org.id, user.id],
  )
  const s = stats!
  const q = admin && mine ? '&assignee=me' : ''

  return (
    <>
      <RememberFilters page="dashboard" qs={remembered.qs} reset={remembered.reset} />
      <PageHeader
        title={`مرحبًا ${user.full_name.split(' ')[0] || ''}`}
        subtitle={`${formatWeekday(today)}، ${formatDate(today)}`}
        actions={
          canManage(user) && (
            <Link href="/tasks/new" className={btn.primary}>
              + مهمة جديدة
            </Link>
          )
        }
      />

      {companiesCount!.n === 0 && canManage(user) && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">ابدأ بإضافة الشركات</h2>
          <p className="mt-1 text-sm text-slate-500">كل مهمة تتبع شركة. أضف الشركات يدويًا أو استوردهم من ملف Excel.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/companies/new" className={btn.primary}>
              إضافة شركة
            </Link>
            <Link href="/import" className={btn.secondary}>
              استيراد من Excel / CSV
            </Link>
          </div>
        </Card>
      )}

      {admin && (
      <div className="mb-3 flex gap-1">
          <Link href="/?scope=mine" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            مهامي
          </Link>
          <Link href="/?scope=all" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            كل مهام المكتب
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="متأخرة" value={s.overdue} href={`/tasks?due=overdue${q}`} tone="red" />
        <StatCard label="موعدها اليوم" value={s.today} href={`/tasks?due=today${q}`} tone="amber" />
        <StatCard label="خلال 7 أيام" value={s.week} href={`/tasks?due=week${q}`} tone="sky" />
        <StatCard label="أُنجزت هذا الأسبوع" value={s.done_week} href={`/tasks?status=done&sort=created${q}`} tone="emerald" />
      </div>

      {toReview.length > 0 && (
        <Card className="mt-6 overflow-hidden border-amber-200">
          <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
            <h2 className="font-semibold text-amber-900">بانتظار مراجعتك ({toReview.length})</h2>
            <Link href="/tasks?status=review" className="text-sm text-brand-700 hover:underline">
              عرض الكل
            </Link>
          </div>
          <TaskList viewer={user} tasks={toReview} today={today} />
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Card className="overflow-hidden xl:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">تحتاج إلى متابعة</h2>
          <Link href={admin && mine ? '/tasks?assignee=me&status=open' : '/tasks?status=open'} className="text-sm text-brand-700 hover:underline">
            {mine ? 'كل مهامي المفتوحة' : 'كل المهام المفتوحة'} ({s.open})
          </Link>
        </div>
        <TaskList viewer={user} tasks={attention} today={today} empty="لا توجد مهام متأخرة أو مستحقة خلال الأيام السبعة القادمة 🎉" />
      </Card>

      {/* Recent activity across the office (H1: keep users informed about what is going on) */}
      <Card className="h-fit overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">آخر النشاطات</h2>
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">لا يوجد نشاط بعد</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((a) => (
              <li key={a.id} className="px-4 py-2.5">
                <p className="text-slate-700">
                  <span className="font-medium">{a.user_id ? (a.who ?? 'مستخدم محذوف') : 'النظام'}</span> {describeActivity(a.action, a.details)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  <Link href={`/tasks/${a.task_id}`} className="text-brand-700 hover:underline">
                    {a.title}
                  </Link>{' '}
                  · {a.company_name} · {formatDateTime(a.created_at, org.timezone)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </>
  )
}
