import Link from 'next/link'
import { RememberFilters } from '@/components/remember-filters'
import { rememberedFilters } from '@/lib/remember-filters'
import { TaskList } from '@/components/task-list'
import { Card, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, todayIn } from '@/lib/dates'
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, tasksCount } from '@/lib/labels'
import { TASK_FILTER_KEYS, companyOptions, filterQuery, listTasks, parseTaskFilters, teamMembers, type TaskFilters } from '@/lib/queries'
import { PrintButton } from '@/components/print-button'

export const metadata = { title: 'المهام' }

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const { org, user } = await requireSession()
  const sp = await searchParams
  const { get, qs: current, reset } = await rememberedFilters('tasks', sp, TASK_FILTER_KEYS)
  const tabHref = (assignee: string) => {
    const qs = filterQuery(get, { assignee })
    return qs ? `/tasks?${qs}` : '/tasks?reset=1'
  }
  const f: TaskFilters = parseTaskFilters(get, user.id)
  const today = todayIn(org.timezone)
  const [tasks, companies, team] = await Promise.all([listTasks(org.id, f, today), companyOptions(org.id), teamMembers(org.id)])
  const filtered = Boolean(f.q || f.company || f.assignee || f.priority || f.due || f.status !== 'all')
  const mine = f.assignee === user.id

  return (
    <>
      <PageHeader
        title={mine ? 'مهامي' : 'المهام'}
        subtitle={tasksCount(tasks.length)}
        actions={
          <>
            <Link href="/templates" className={btn.secondary}>
              القوالب
            </Link>
            <Link href={f.company ? `/tasks/bulk?company=${f.company}` : '/tasks/bulk'} className={btn.secondary}>
              إضافة عدة مهام
            </Link>
            <Link href={f.company ? `/tasks/new?company=${f.company}` : '/tasks/new'} className={btn.primary}>
              + مهمة جديدة
            </Link>
          </>
        }
      />

      <p className="mb-2 hidden text-sm text-slate-600 print:block">
        {org.name} · طُبعت في {formatDate(today)}
      </p>
      <div className="mb-3 flex gap-1 print:hidden">
        <Link href={tabHref('')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          كل المهام
        </Link>
        <Link href={tabHref('me')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mine ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          مهامي
        </Link>
      </div>

      {/* Plain GET form: filters live in the URL, so a filtered view can be bookmarked or shared (FR-7.1, FR-7.2) */}
      <Card className="mb-4 p-4 print:hidden">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <input name="q" defaultValue={f.q} placeholder="بحث في المهام والشركات…" className={`${inputCls} lg:col-span-2`} />
          <select name="company" defaultValue={f.company} className={inputCls}>
            <option value="">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="assignee" defaultValue={mine ? user.id : f.assignee} className={inputCls}>
            <option value="">كل المسؤولين</option>
            {team
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === user.id ? `${m.full_name} (أنا)` : m.full_name}
                </option>
              ))}
          </select>
          <select name="status" defaultValue={f.status} className={inputCls}>
            <option value="all">كل الحالات</option>
            <option value="open">المفتوحة</option>
            <option value="closed">المنجزة والملغاة</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select name="due" defaultValue={f.due} className={inputCls}>
            <option value="">أي موعد</option>
            <option value="overdue">متأخرة فقط</option>
            <option value="today">موعدها اليوم</option>
            <option value="week">خلال 7 أيام</option>
            <option value="later">بعد أكثر من أسبوع</option>
          </select>
          <select name="priority" defaultValue={f.priority} className={inputCls}>
            <option value="">كل الأولويات</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-7">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              ترتيب حسب
              <select name="sort" defaultValue={f.sort} className={`${inputCls} w-auto`}>
                <option value="deadline">موعد التسليم</option>
                <option value="priority">الأولوية</option>
                <option value="company">الشركة</option>
                <option value="status">الحالة</option>
                <option value="created">الأحدث إضافة</option>
              </select>
            </label>
            <button className={btn.primary}>تطبيق</button>
            <span className="ms-auto flex gap-2">
              <a href={`/api/export/tasks?${new URLSearchParams(current)}`} className={btn.secondary}>
                تصدير Excel
              </a>
              <PrintButton className={btn.secondary} />
            </span>
            {filtered && (
              <Link href="/tasks?reset=1" className={btn.ghost}>
                مسح الفلاتر
              </Link>
            )}
          </div>
        </form>
      </Card>

      <RememberFilters page="tasks" qs={current} reset={reset} />
      <Card className="overflow-hidden">
        <TaskList tasks={tasks} today={today} empty={filtered ? 'لا توجد مهام مطابقة' : 'لا توجد مهام بعد'} />
      </Card>
    </>
  )
}
