import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Card, Empty, PageHeader, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { formatDate, relativeDue, todayIn } from '@/lib/dates'
import { NOTIF_LABEL } from '@/lib/labels'
import type { NotifKind } from '@/lib/types'

export const metadata = { title: 'التنبيهات' }

type Row = {
  id: string
  kind: NotifKind
  read_at: Date | null
  task_id: string
  title: string
  deadline: string
  company_name: string
}

async function markAllRead() {
  'use server'
  const { user } = await requireSession()
  await query('update notifications set read_at = now() where user_id = $1 and read_at is null', [user.id])
  revalidatePath('/', 'layout')
}

async function markRead(id: string) {
  'use server'
  const { user } = await requireSession()
  await query('update notifications set read_at = now() where id = $1 and user_id = $2', [id, user.id])
  revalidatePath('/', 'layout')
}

const KIND_STYLE: Record<NotifKind, string> = {
  overdue: 'bg-red-100 text-red-700',
  due_today: 'bg-amber-100 text-amber-800',
  due_soon: 'bg-sky-100 text-sky-800',
}

export default async function NotificationsPage() {
  const { user, org } = await requireSession()
  const today = todayIn(org.timezone)
  // Only the latest reminder per task is shown (overdue reminders repeat daily).
  const rows = await query<Row>(
    `select distinct on (n.task_id) n.id, n.kind, n.read_at, n.task_id, t.title, t.deadline, c.name as company_name
       from notifications n join tasks t on t.id = n.task_id join companies c on c.id = t.company_id
      where n.user_id = $1 and n.created_at > now() - interval '30 days'
      order by n.task_id, n.created_at desc`,
    [user.id],
  )
  rows.sort((a, b) => Number(!!a.read_at) - Number(!!b.read_at) || a.deadline.localeCompare(b.deadline))
  const unread = rows.filter((r) => !r.read_at).length

  return (
    <>
      <PageHeader
        title="التنبيهات"
        subtitle={unread ? `${unread} غير مقروءة` : 'لا توجد تنبيهات جديدة'}
        actions={
          unread > 0 && (
            <form action={markAllRead}>
              <button className={btn.secondary}>تحديد الكل كمقروء</button>
            </form>
          )
        }
      />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty>لا توجد تنبيهات خلال آخر 30 يومًا</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-center gap-3 px-4 py-3 ${n.read_at ? 'opacity-60' : 'bg-white'}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-brand-600'}`} />
                <div className="min-w-0 flex-1">
                  <span className={`me-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[n.kind]}`}>
                    {NOTIF_LABEL[n.kind]}
                  </span>
                  <Link href={`/tasks/${n.task_id}`} className="font-medium hover:text-brand-700">
                    {n.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {n.company_name} · {formatDate(n.deadline, 'short')} ({relativeDue(n.deadline, today)})
                  </div>
                </div>
                {!n.read_at && (
                  <form action={markRead.bind(null, n.id)}>
                    <button className={btn.ghost}>تم</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
