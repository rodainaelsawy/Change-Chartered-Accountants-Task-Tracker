import Link from 'next/link'
import { RememberFilters } from '@/components/remember-filters'
import { rememberedFilters } from '@/lib/remember-filters'
import { Card, PageHeader, btn, urgency } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { addDays, addMonthsClamped, formatDate, formatWeekday, startOfWeek, todayIn } from '@/lib/dates'
import { TASK_SELECT, assignedTo, companyOptions } from '@/lib/queries'
import { tasksCount } from '@/lib/labels'
import type { Task } from '@/lib/types'

export const metadata = { title: 'التقويم' }

const WEEKDAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const monthFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const CHIP = {
  overdue: 'bg-red-100 text-red-800 border-red-200',
  soon: 'bg-amber-100 text-amber-900 border-amber-200',
  later: 'bg-sky-50 text-sky-900 border-sky-100',
  closed: 'bg-emerald-50 text-emerald-800 border-emerald-100 line-through',
}

function TaskChip({ t, today }: { t: Task; today: string }) {
  return (
    <Link
      href={`/tasks/${t.id}`}
      title={`${t.title} — ${t.company_name}`}
      className={`block truncate rounded border px-1.5 py-0.5 text-[11px] leading-4 ${CHIP[urgency(t.status, t.deadline, today)]}`}
    >
      {t.title}
      <span className="opacity-70"> · {t.company_name}</span>
    </Link>
  )
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { org, user } = await requireSession()
  const raw = await searchParams
  const remembered = await rememberedFilters('calendar', raw, ['scope', 'company', 'closed'])
  const sp = { month: typeof raw.month === 'string' ? raw.month : undefined, scope: remembered.get('scope'), company: remembered.get('company') || undefined, closed: remembered.get('closed') }
  const today = todayIn(org.timezone)
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7)
  const first = `${month}-01`
  const last = addDays(addMonthsClamped(first, 1), -1)
  // Grid: Saturday-first weeks covering the whole month.
  const gridStart = startOfWeek(first)
  const gridEnd = addDays(startOfWeek(last), 6)
  const mine = sp.scope ? sp.scope === 'mine' : user.role !== 'admin'
  const showClosed = sp.closed === '1'

  const params: unknown[] = [org.id, gridStart, gridEnd]
  const where = ['t.org_id = $1', 't.deadline between $2 and $3']
  if (mine) {
    params.push(user.id)
    where.push(assignedTo(`$${params.length}`))
  }
  if (sp.company && /^[0-9a-f-]{36}$/i.test(sp.company)) {
    params.push(sp.company)
    where.push(`t.company_id = $${params.length}`)
  }
  if (!showClosed) where.push(`t.status not in ('done', 'cancelled')`)
  const [tasks, companies] = await Promise.all([
    query<Task>(`${TASK_SELECT} where ${where.join(' and ')} order by t.deadline, t.priority desc`, params),
    companyOptions(org.id),
  ])
  const byDay = new Map<string, Task[]>()
  for (const t of tasks) byDay.set(t.deadline, [...(byDay.get(t.deadline) ?? []), t])

  const days: string[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { month, scope: mine ? 'mine' : 'all', company: sp.company, closed: showClosed ? '1' : undefined, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/calendar?${p}`
  }
  const prev = addMonthsClamped(first, -1).slice(0, 7)
  const next = addMonthsClamped(first, 1).slice(0, 7)
  const monthDays = days.filter((d) => d.startsWith(month) && byDay.has(d))

  return (
    <>
      <RememberFilters page="calendar" qs={remembered.qs} reset={remembered.reset} />
      <PageHeader
        title="التقويم"
        subtitle={`${tasksCount(tasks.length)} في ${monthFmt.format(new Date(first + 'T00:00:00Z'))}`}
        actions={
          <Link href="/tasks/new" className={btn.primary}>
            + مهمة جديدة
          </Link>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-1">
          <Link href={qs({ month: prev })} className={btn.ghost} aria-label="الشهر السابق">
            → السابق
          </Link>
          <span className="min-w-32 text-center font-semibold">{monthFmt.format(new Date(first + 'T00:00:00Z'))}</span>
          <Link href={qs({ month: next })} className={btn.ghost} aria-label="الشهر التالي">
            التالي ←
          </Link>
          {month !== today.slice(0, 7) && (
            <Link href={qs({ month: today.slice(0, 7) })} className={btn.ghost}>
              اليوم
            </Link>
          )}
        </div>
        <div className="flex gap-1">
          <Link href={qs({ scope: 'mine' })} className={`rounded-lg px-3 py-1 text-sm ${mine ? 'bg-brand-50 font-medium text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            مهامي
          </Link>
          <Link href={qs({ scope: 'all' })} className={`rounded-lg px-3 py-1 text-sm ${!mine ? 'bg-brand-50 font-medium text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
            كل المهام
          </Link>
        </div>
        <form action="/calendar" className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="scope" value={mine ? 'mine' : 'all'} />
          <select name="company" defaultValue={sp.company ?? ''} className="rounded-lg border border-slate-300 px-2 py-1">
            <option value="">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" name="closed" value="1" defaultChecked={showClosed} /> إظهار المنجزة
          </label>
          <button className="rounded-lg bg-slate-100 px-3 py-1 hover:bg-slate-200">تطبيق</button>
        </form>
      </Card>

      {/* Month grid (tablet and desktop) */}
      <Card className="hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = byDay.get(d) ?? []
            const inMonth = d.startsWith(month)
            return (
              <div key={d} className={`min-h-28 border-b border-s border-slate-100 p-1.5 ${inMonth ? '' : 'bg-slate-50/70'}`}>
                <div
                  className={`mb-1 text-xs ${
                    d === today ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 font-bold text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {Number(d.slice(8))}
                </div>
                <div className="space-y-1">
                  {list.slice(0, 4).map((t) => (
                    <TaskChip key={t.id} t={t} today={today} />
                  ))}
                  {list.length > 4 && (
                    <details>
                      <summary className="cursor-pointer px-1 text-[11px] text-slate-500 hover:underline">+{list.length - 4} أخرى</summary>
                      <div className="mt-1 space-y-1">
                        {list.slice(4).map((t) => (
                          <TaskChip key={t.id} t={t} today={today} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Agenda (phones) */}
      <div className="space-y-3 md:hidden">
        {monthDays.length === 0 && <Card className="p-6 text-center text-sm text-slate-500">لا توجد مهام في هذا الشهر</Card>}
        {monthDays.map((d) => (
          <Card key={d} className="overflow-hidden">
            <div className={`border-b border-slate-100 px-4 py-2 text-sm font-semibold ${d === today ? 'bg-brand-50 text-brand-800' : 'bg-slate-50'}`}>
              {formatWeekday(d)}، {formatDate(d)}
            </div>
            <ul className="divide-y divide-slate-100">
              {byDay.get(d)!.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${CHIP[urgency(t.status, t.deadline, today)]}`} />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{t.company_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  )
}
