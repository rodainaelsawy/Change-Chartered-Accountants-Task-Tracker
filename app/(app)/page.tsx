import Link from 'next/link'
import { TaskList } from '@/components/task-list'
import { Card, PageHeader, StatCard, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { addDays, formatDate, formatWeekday, startOfWeek, todayIn } from '@/lib/dates'
import { TASK_SELECT } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const metadata = { title: 'لوحة المتابعة' }

const OPEN = `('not_started','in_progress','on_hold')`

export default async function Dashboard() {
  const { user, org } = await requireSession()
  const today = todayIn(org.timezone)
  const weekEnd = addDays(today, 7)

  const [stats, attention, clientsCount] = await Promise.all([
    one<{ overdue: number; today: number; week: number; done_week: number; open: number }>(
      `select
         count(*) filter (where status in ${OPEN} and deadline < $2)::int                  as overdue,
         count(*) filter (where status in ${OPEN} and deadline = $2)::int                  as today,
         count(*) filter (where status in ${OPEN} and deadline > $2 and deadline <= $3)::int as week,
         count(*) filter (where status = 'done' and completed_at >= $4::date)::int         as done_week,
         count(*) filter (where status in ${OPEN})::int                                    as open
       from tasks where org_id = $1`,
      [org.id, today, weekEnd, startOfWeek(today)],
    ),
    // "Needs attention": overdue first, then everything due in the next 7 days (FR-6.2)
    query<Task>(
      `${TASK_SELECT} where t.org_id = $1 and t.status in ${OPEN} and t.deadline <= $2
        order by t.deadline, t.priority desc limit 50`,
      [org.id, weekEnd],
    ),
    one<{ n: number }>('select count(*)::int as n from clients where org_id = $1 and archived_at is null', [org.id]),
  ])
  const s = stats!

  return (
    <>
      <PageHeader
        title={`مرحبًا ${user.full_name.split(' ')[0] || ''}`}
        subtitle={`${formatWeekday(today)}، ${formatDate(today)}`}
        actions={
          <Link href="/tasks/new" className={btn.primary}>
            + مهمة جديدة
          </Link>
        }
      />

      {clientsCount!.n === 0 && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">ابدأ بإضافة العملاء</h2>
          <p className="mt-1 text-sm text-slate-500">كل مهمة تتبع عميلًا. أضف العملاء يدويًا أو استوردهم من ملف Excel.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clients/new" className={btn.primary}>
              إضافة عميل
            </Link>
            <Link href="/import" className={btn.secondary}>
              استيراد من Excel / CSV
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="متأخرة" value={s.overdue} href="/tasks?due=overdue" tone="red" />
        <StatCard label="موعدها اليوم" value={s.today} href="/tasks?due=today" tone="amber" />
        <StatCard label="خلال 7 أيام" value={s.week} href="/tasks?due=week" tone="sky" />
        <StatCard label="أُنجزت هذا الأسبوع" value={s.done_week} href="/tasks?status=done&sort=created" tone="emerald" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">تحتاج إلى متابعة</h2>
          <Link href="/tasks" className="text-sm text-brand-700 hover:underline">
            كل المهام المفتوحة ({s.open})
          </Link>
        </div>
        <TaskList tasks={attention} today={today} empty="لا توجد مهام متأخرة أو مستحقة خلال الأيام السبعة القادمة 🎉" />
      </Card>
    </>
  )
}
