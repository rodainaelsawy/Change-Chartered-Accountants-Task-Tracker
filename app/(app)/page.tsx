import Link from 'next/link'
import { TaskList } from '@/components/task-list'
import { Card, PageHeader, StatCard, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { addDays, formatDate, formatWeekday, startOfWeek, todayIn } from '@/lib/dates'
import { TASK_SELECT, assignedTo } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const metadata = { title: 'لوحة المتابعة' }

const OPEN = `('not_started','in_progress','on_hold')`

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { user, org } = await requireSession()
  const { scope } = await searchParams
  // Admins see the whole office by default; members see their own tasks. Both can switch.
  const mine = scope ? scope === 'mine' : user.role !== 'admin'
  const mineSql = (param: string) => (mine ? `and ${assignedTo(param)}` : `and ${param}::uuid is not null`)
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
  const s = stats!
  const q = mine ? '&assignee=me' : ''

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

      {companiesCount!.n === 0 && (
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

      <div className="mb-3 flex gap-1">
        <Link href="/?scope=mine" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          مهامي
        </Link>
        <Link href="/?scope=all" className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          كل مهام المكتب
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="متأخرة" value={s.overdue} href={`/tasks?due=overdue${q}`} tone="red" />
        <StatCard label="موعدها اليوم" value={s.today} href={`/tasks?due=today${q}`} tone="amber" />
        <StatCard label="خلال 7 أيام" value={s.week} href={`/tasks?due=week${q}`} tone="sky" />
        <StatCard label="أُنجزت هذا الأسبوع" value={s.done_week} href={`/tasks?status=done&sort=created${q}`} tone="emerald" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">تحتاج إلى متابعة</h2>
          <Link href={mine ? '/tasks?assignee=me' : '/tasks'} className="text-sm text-brand-700 hover:underline">
            {mine ? 'كل مهامي المفتوحة' : 'كل المهام المفتوحة'} ({s.open})
          </Link>
        </div>
        <TaskList tasks={attention} today={today} empty="لا توجد مهام متأخرة أو مستحقة خلال الأيام السبعة القادمة 🎉" />
      </Card>
    </>
  )
}
