import Link from 'next/link'
import { Card, PageHeader } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { query } from '@/lib/db'
import { addDays, todayIn } from '@/lib/dates'
import { OPEN_SQL, ROLE_LABEL } from '@/lib/labels'
import type { UserRole } from '@/lib/types'

export const metadata = { title: 'توزيع العمل' }

type Row = {
  id: string
  full_name: string
  role: UserRole
  open: number
  overdue: number
  today: number
  week: number
  in_review: number
  done_month: number
  done_late_month: number
  to_review: number
  following: number
}

/** Team workload (admin): open / overdue / due soon per assignee, and pending reviews per follower. */
export default async function WorkloadPage() {
  const { org } = await requireAdmin()
  const today = todayIn(org.timezone)
  const monthStart = today.slice(0, 8) + '01'
  const rows = await query<Row>(
    `select u.id, u.full_name, u.role,
            count(t.id) filter (where t.status in ${OPEN_SQL})::int                                          as open,
            count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $2)::int                        as overdue,
            count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline = $2)::int                        as today,
            count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline > $2 and t.deadline <= $3)::int   as week,
            count(t.id) filter (where t.status = 'review')::int                                               as in_review,
            count(t.id) filter (where t.status = 'done' and t.completed_at >= $4::date)::int                    as done_month,
            count(t.id) filter (where t.status = 'done' and t.completed_at >= $4::date
                                  and (t.completed_at at time zone $5)::date > t.deadline)::int                as done_late_month,
            (select count(*)::int from task_followers f join tasks ft on ft.id = f.task_id
              where f.user_id = u.id and ft.status = 'review')                                                as to_review,
            (select count(*)::int from task_followers f join tasks ft on ft.id = f.task_id
              where f.user_id = u.id and ft.status in ${OPEN_SQL})                                            as following
       from users u
       left join task_assignees a on a.user_id = u.id
       left join tasks t on t.id = a.task_id and t.org_id = u.org_id
      where u.org_id = $1 and u.active
      group by u.id
      order by count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $2) desc,
               count(t.id) filter (where t.status in ${OPEN_SQL}) desc, u.full_name`,
    [org.id, today, addDays(today, 7), monthStart, org.timezone],
  )
  const doers = rows.filter((r) => r.role !== 'follower')
  const reviewers = rows.filter((r) => r.following > 0 || r.role === 'follower')
  const maxOpen = Math.max(1, ...doers.map((r) => r.open))
  const link = (id: string, extra = '') => `/tasks?assignee=${id}${extra}`
  const num = (n: number, href: string, cls = '') =>
    n ? (
      <Link href={href} className={`tabular-nums hover:underline ${cls}`}>
        {n}
      </Link>
    ) : (
      <span className="text-slate-300">0</span>
    )

  return (
    <>
      <PageHeader title="توزيع العمل" subtitle="حجم المهام المفتوحة لكل عضو في الفريق — اضغط على أي رقم لعرض المهام" />

      <Card className="mb-6 overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">المسؤولون عن المهام</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">العضو</th>
                <th className="w-1/4 px-4 py-2 font-medium">المهام المفتوحة</th>
                <th className="px-3 py-2 text-center font-medium">متأخرة</th>
                <th className="px-3 py-2 text-center font-medium">اليوم</th>
                <th className="px-3 py-2 text-center font-medium">خلال 7 أيام</th>
                <th className="px-3 py-2 text-center font-medium">بانتظار المراجعة</th>
                <th className="px-3 py-2 text-center font-medium">أُنجزت هذا الشهر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doers.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABEL[r.role]}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${r.overdue ? 'bg-red-500' : 'bg-brand-600'}`}
                          style={{ width: `${(r.open / maxOpen) * 100}%` }}
                        />
                      </div>
                      {num(r.open, link(r.id, '&status=open'), 'w-8 font-semibold')}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">{num(r.overdue, link(r.id, '&due=overdue'), 'rounded-full bg-red-100 px-2 py-0.5 text-red-700')}</td>
                  <td className="px-3 py-3 text-center">{num(r.today, link(r.id, '&due=today'), 'text-amber-700')}</td>
                  <td className="px-3 py-3 text-center">{num(r.week, link(r.id, '&due=week'))}</td>
                  <td className="px-3 py-3 text-center">{num(r.in_review, link(r.id, '&status=review'), 'text-amber-700')}</td>
                  <td className="px-3 py-3 text-center">
                    {num(r.done_month, link(r.id, '&status=done&sort=created'), 'text-emerald-700')}
                    {r.done_late_month > 0 && <span className="ms-1 text-xs text-amber-700">({r.done_late_month} متأخرة)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">المتابعون (المراجعة)</h2>
        {reviewers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">لا يوجد متابعون على المهام المفتوحة بعد. أضف متابعًا من نموذج المهمة.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">العضو</th>
                <th className="px-3 py-2 text-center font-medium">مهام مفتوحة يتابعها</th>
                <th className="px-3 py-2 text-center font-medium">بانتظار مراجعته</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviewers.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABEL[r.role]}</div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{r.following}</td>
                  <td className="px-3 py-3 text-center">
                    {r.to_review ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 tabular-nums text-amber-800">{r.to_review}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
