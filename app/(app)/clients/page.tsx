import Link from 'next/link'
import { Card, Empty, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { todayIn } from '@/lib/dates'

export const metadata = { title: 'العملاء' }

type Row = {
  id: string
  name: string
  company: string | null
  contact_person: string | null
  phone: string | null
  archived_at: Date | null
  open: number
  overdue: number
  done: number
  next_deadline: string | null
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  const { org } = await requireSession()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const archived = sp.archived === '1'
  const today = todayIn(org.timezone)

  const rows = await query<Row>(
    `select c.id, c.name, c.company, c.contact_person, c.phone, c.archived_at,
            count(t.id) filter (where t.status in ('not_started','in_progress','on_hold'))::int as open,
            count(t.id) filter (where t.status in ('not_started','in_progress','on_hold') and t.deadline < $2)::int as overdue,
            count(t.id) filter (where t.status = 'done')::int as done,
            min(t.deadline) filter (where t.status in ('not_started','in_progress','on_hold')) as next_deadline
       from clients c left join tasks t on t.client_id = c.id
      where c.org_id = $1 and (c.archived_at is not null) = $3
        and ($4 = '' or c.name ilike '%' || $4 || '%' or c.company ilike '%' || $4 || '%'
             or c.contact_person ilike '%' || $4 || '%' or c.phone ilike '%' || $4 || '%')
      group by c.id
      order by count(t.id) filter (where t.status in ('not_started','in_progress','on_hold') and t.deadline < $2) desc, c.name`,
    [org.id, today, archived, q],
  )

  return (
    <>
      <PageHeader
        title={archived ? 'العملاء المؤرشفون' : 'العملاء'}
        subtitle={`${rows.length} عميل`}
        actions={
          <>
            <Link href="/import" className={btn.secondary}>
              استيراد من Excel
            </Link>
            <Link href="/clients/new" className={btn.primary}>
              + عميل جديد
            </Link>
          </>
        }
      />
      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-center gap-2">
          <input name="q" defaultValue={q} placeholder="بحث بالاسم أو الشركة أو الهاتف…" className={`${inputCls} max-w-sm`} />
          {archived && <input type="hidden" name="archived" value="1" />}
          <button className={btn.primary}>بحث</button>
          <Link href={archived ? '/clients' : '/clients?archived=1'} className={`${btn.ghost} ms-auto`}>
            {archived ? 'عرض العملاء الحاليين' : 'عرض المؤرشفين'}
          </Link>
        </form>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty>{q ? 'لا يوجد عملاء مطابقون' : archived ? 'لا يوجد عملاء مؤرشفون' : 'لم تتم إضافة عملاء بعد'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">العميل</th>
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
                      <Link href={`/clients/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {c.name}
                      </Link>
                      {c.company && <div className="text-xs text-slate-500">{c.company}</div>}
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
