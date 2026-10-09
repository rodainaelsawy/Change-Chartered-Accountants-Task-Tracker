import Link from 'next/link'
import { canManage, visibleTo } from '@/lib/permissions'
import { OPEN_SQL } from '@/lib/labels'
import { RememberFilters } from '@/components/remember-filters'
import { rememberedFilters } from '@/lib/remember-filters'
import { Card, Empty, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { todayIn } from '@/lib/dates'
import { companiesCount } from '@/lib/labels'

export const metadata = { title: 'الشركات' }

type Row = {
  id: string
  name: string
  activity: string | null
  contact_person: string | null
  phone: string | null
  archived_at: Date | null
  open: number
  overdue: number
  done: number
  next_deadline: string | null
}

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { org, user } = await requireSession()
  const remembered = await rememberedFilters('companies', await searchParams, ['q', 'archived'])
  const q = remembered.get('q').trim()
  const archived = remembered.get('archived') === '1'
  const today = todayIn(org.timezone)

  const rows = await query<Row>(
    `select c.id, c.name, c.activity, c.contact_person, c.phone, c.archived_at,
            count(t.id) filter (where t.status in ${OPEN_SQL})::int as open,
            count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $2)::int as overdue,
            count(t.id) filter (where t.status = 'done')::int as done,
            min(t.deadline) filter (where t.status in ${OPEN_SQL}) as next_deadline
       from companies c left join tasks t on t.company_id = c.id and ${visibleTo(user, '$5')}
      where c.org_id = $1 and (c.archived_at is not null) = $3
        and ($4 = '' or c.name ilike '%' || $4 || '%' or c.activity ilike '%' || $4 || '%'
             or c.contact_person ilike '%' || $4 || '%' or c.phone ilike '%' || $4 || '%')
      group by c.id
      order by count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $2) desc, c.name`,
    [org.id, today, archived, q, user.id],
  )

  return (
    <>
      <RememberFilters page="companies" qs={remembered.qs} reset={remembered.reset} />
      <PageHeader
        title={archived ? 'الشركات المؤرشفة' : 'الشركات'}
        subtitle={companiesCount(rows.length)}
        actions={
          canManage(user) && (
          <>
            <Link href="/import" className={btn.secondary}>
              استيراد من Excel
            </Link>
            <Link href="/companies/new" className={btn.primary}>
              + شركة جديدة
            </Link>
          </>
          )
        }
      />
      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-center gap-2">
          <input name="q" defaultValue={q} placeholder="بحث بالاسم أو النشاط أو الهاتف…" className={`${inputCls} max-w-sm`} />
          {archived && <input type="hidden" name="archived" value="1" />}
          <button className={btn.primary}>بحث</button>
          <Link href={archived ? '/companies?archived=0' : '/companies?archived=1'} className={`${btn.ghost} ms-auto`}>
            {archived ? 'عرض الشركات الحالية' : 'عرض المؤرشفة'}
          </Link>
        </form>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty>{q ? 'لا توجد شركات مطابقة' : archived ? 'لا توجد شركات مؤرشفة' : 'لم تتم إضافة شركات بعد'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">الشركة</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">المسؤول</th>
                  <th className="px-4 py-2 text-center font-medium">مفتوحة</th>
                  <th className="px-4 py-2 text-center font-medium">متأخرة</th>
                  <th className="hidden px-4 py-2 text-center font-medium sm:table-cell">منجزة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {c.name}
                      </Link>
                      {c.activity && <div className="text-xs text-slate-500">{c.activity}</div>}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {c.contact_person}
                      {c.phone && <div className="ltr text-right text-xs text-slate-400">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{c.open}</td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {c.overdue > 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">{c.overdue}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-center tabular-nums text-emerald-700 sm:table-cell">{c.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
