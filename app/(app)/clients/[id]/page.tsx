import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteClient, setClientArchived } from '@/app/actions/clients'
import { ConfirmButton } from '@/components/action-form'
import { TaskList } from '@/components/task-list'
import { Alert, Card, PageHeader, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { todayIn } from '@/lib/dates'
import { TASK_SELECT } from '@/lib/queries'
import type { Client, Task } from '@/lib/types'

export const metadata = { title: 'العميل' }

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ closed?: string }>
}) {
  const { org } = await requireSession()
  const { id } = await params
  const { closed } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const client = await one<Client>('select * from clients where id = $1 and org_id = $2', [id, org.id])
  if (!client) notFound()

  const today = todayIn(org.timezone)
  const tasks = await query<Task>(`${TASK_SELECT} where t.client_id = $1 order by t.deadline`, [id])
  const open = tasks.filter((t) => ['not_started', 'in_progress', 'on_hold'].includes(t.status))
  const done = tasks.filter((t) => !open.includes(t))
  const overdue = open.filter((t) => t.deadline < today).length

  const info: [string, string | null, boolean?][] = [
    ['الشركة / النشاط', client.company],
    ['الشخص المسؤول', client.contact_person],
    ['الهاتف', client.phone, true],
    ['البريد الإلكتروني', client.email, true],
  ]

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/clients" className="text-brand-700 hover:underline">
          العملاء
        </Link>
      </div>
      <PageHeader
        title={client.name}
        subtitle={`${open.length} مفتوحة · ${overdue} متأخرة · ${done.filter((t) => t.status === 'done').length} منجزة`}
        actions={
          <>
            <Link href={`/tasks/new?client=${client.id}`} className={btn.primary}>
              + مهمة لهذا العميل
            </Link>
            <Link href={`/clients/${client.id}/edit`} className={btn.secondary}>
              تعديل
            </Link>
          </>
        }
      />

      {client.archived_at && (
        <div className="mb-4">
          <Alert kind="info">هذا العميل مؤرشف ولا يظهر في القوائم.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">المهام المفتوحة ({open.length})</h2>
            <TaskList tasks={open} today={today} showClient={false} empty="لا توجد مهام مفتوحة لهذا العميل" />
          </Card>
          {done.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold">المنجزة والملغاة ({done.length})</h2>
                <Link href={closed ? `/clients/${id}` : `/clients/${id}?closed=1`} className="text-sm text-brand-700 hover:underline">
                  {closed ? 'إخفاء' : 'عرض'}
                </Link>
              </div>
              {closed && <TaskList tasks={[...done].reverse()} today={today} showClient={false} />}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-semibold">بيانات العميل</h2>
            <dl className="space-y-3">
              {info.map(([label, value, ltr]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className={ltr ? 'ltr text-right' : ''}>{value || <span className="text-slate-300">—</span>}</dd>
                </div>
              ))}
              {client.notes && (
                <div>
                  <dt className="text-xs text-slate-400">ملاحظات</dt>
                  <dd className="whitespace-pre-wrap">{client.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card className="space-y-2 p-5">
            <form action={setClientArchived.bind(null, client.id, !client.archived_at)}>
              <button className={`${btn.secondary} w-full`}>{client.archived_at ? 'إلغاء الأرشفة' : 'أرشفة العميل'}</button>
            </form>
            <ConfirmButton
              action={deleteClient.bind(null, client.id)}
              confirmText={`سيتم حذف العميل "${client.name}" وجميع مهامه (${tasks.length}) نهائيًا. هل أنت متأكد؟`}
              className={`${btn.danger} w-full`}
            >
              حذف العميل
            </ConfirmButton>
          </Card>
        </div>
      </div>
    </>
  )
}
