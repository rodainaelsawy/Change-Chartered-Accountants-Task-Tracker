import Link from 'next/link'
import { TaskList } from '@/components/task-list'
import { Card, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { todayIn } from '@/lib/dates'
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/labels'
import { companyOptions, listTasks, type TaskFilters } from '@/lib/queries'

export const metadata = { title: 'المهام' }

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const { org } = await requireSession()
  const sp = await searchParams
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '')
  const f: TaskFilters = {
    q: get('q'),
    company: get('company'),
    status: get('status') || 'open',
    priority: get('priority'),
    due: get('due'),
    sort: get('sort') || 'deadline',
  }
  const today = todayIn(org.timezone)
  const [tasks, companies] = await Promise.all([listTasks(org.id, f, today), companyOptions(org.id)])
  const filtered = Boolean(f.q || f.company || f.priority || f.due || f.status !== 'open')

  return (
    <>
      <PageHeader
        title="المهام"
        subtitle={`${tasks.length} مهمة`}
        actions={
          <Link href={f.company ? `/tasks/new?company=${f.company}` : '/tasks/new'} className={btn.primary}>
            + مهمة جديدة
          </Link>
        }
      />

      {/* Plain GET form: filters live in the URL, so a filtered view can be bookmarked or shared (FR-7.1, FR-7.2) */}
      <Card className="mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={f.q} placeholder="بحث في المهام والشركات…" className={`${inputCls} lg:col-span-2`} />
          <select name="company" defaultValue={f.company} className={inputCls}>
            <option value="">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={f.status} className={inputCls}>
            <option value="open">المفتوحة</option>
            <option value="all">كل الحالات</option>
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
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
            {filtered && (
              <Link href="/tasks" className={btn.ghost}>
                مسح الفلاتر
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <TaskList tasks={tasks} today={today} empty={filtered ? 'لا توجد مهام مطابقة' : 'لا توجد مهام مفتوحة'} />
      </Card>
    </>
  )
}
