import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { TaskList } from '@/components/task-list'
import { Card, Empty, PageHeader, inputCls, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { todayIn } from '@/lib/dates'
import { companiesCount, tasksCount } from '@/lib/labels'
import { TASK_SELECT } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const metadata = { title: 'بحث' }

/** Global search across companies and tasks (H6 recognition, H7 efficiency). */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { org } = await requireSession()
  const q = ((await searchParams).q ?? '').trim()
  const like = `%${q}%`
  const [companies, tasks] = q
    ? await Promise.all([
        query<{ id: string; name: string; activity: string | null; contact_person: string | null; phone: string | null; archived_at: Date | null }>(
          `select id, name, activity, contact_person, phone, archived_at from companies
            where org_id = $1 and (name ilike $2 or activity ilike $2 or contact_person ilike $2 or phone ilike $2
                                   or email ilike $2 or tax_username ilike $2 or tax_email ilike $2 or notes ilike $2)
            order by archived_at nulls first, name limit 30`,
          [org.id, like],
        ),
        query<Task>(
          `${TASK_SELECT} where t.org_id = $1 and (t.title ilike $2 or t.description ilike $2 or c.name ilike $2)
            order by (t.status in ('done', 'cancelled')), t.deadline limit 50`,
          [org.id, like],
        ),
      ])
    : [[], []]

  return (
    <>
      <BackButton />
      <PageHeader title="بحث" subtitle={q ? `نتائج «${q}»: ${companiesCount(companies.length)} و${tasksCount(tasks.length)}` : 'ابحث بالاسم أو النشاط أو الهاتف أو عنوان المهمة'} />
      <Card className="mb-4 p-4">
        <form className="flex gap-2" role="search">
          <input name="q" defaultValue={q} autoFocus placeholder="اكتب كلمة للبحث…" className={`${inputCls} flex-1`} />
          <button className={btn.primary}>بحث</button>
        </form>
      </Card>
      {q && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="h-fit overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">الشركات ({companies.length})</h2>
            {companies.length === 0 ? (
              <Empty>لا توجد شركات مطابقة</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <li key={c.id}>
                    <Link href={`/companies/${c.id}`} className="block px-4 py-3 hover:bg-slate-50">
                      <div className="font-medium text-slate-900">
                        {c.name}
                        {c.archived_at && <span className="ms-2 rounded bg-slate-100 px-1.5 text-xs text-slate-500">مؤرشفة</span>}
                      </div>
                      <div className="text-xs text-slate-500">{[c.activity, c.contact_person, c.phone].filter(Boolean).join(' · ')}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="h-fit overflow-hidden xl:col-span-2">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">المهام ({tasks.length})</h2>
            <TaskList tasks={tasks} today={todayIn(org.timezone)} empty="لا توجد مهام مطابقة" />
          </Card>
        </div>
      )}
    </>
  )
}
