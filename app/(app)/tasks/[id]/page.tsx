import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteTask, duplicateTask, setTaskStatus } from '@/app/actions/tasks'
import { ConfirmButton } from '@/components/action-form'
import { TaskForm } from '@/components/task-form'
import { Alert, Card, DueText, PageHeader, StatusBadge, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one } from '@/lib/db'
import { formatDate, formatDateTime, todayIn } from '@/lib/dates'
import { isOpen } from '@/lib/labels'
import { companyOptions } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const metadata = { title: 'تفاصيل المهمة' }

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ copied?: string }>
}) {
  const { org } = await requireSession()
  const { id } = await params
  const { copied } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const task = await one<Task>(
    `select t.*, c.name as company_name, cu.full_name as created_by_name, uu.full_name as updated_by_name
       from tasks t join companies c on c.id = t.company_id
       left join users cu on cu.id = t.created_by
       left join users uu on uu.id = t.updated_by
      where t.id = $1 and t.org_id = $2`,
    [id, org.id],
  )
  if (!task) notFound()
  const companies = await companyOptions(org.id, task.company_id)
  const today = todayIn(org.timezone)
  const open = isOpen(task.status)

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`/companies/${task.company_id}`} className="text-brand-700 hover:underline">
          {task.company_name}
        </Link>
      </div>
      <PageHeader
        title={task.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <span>موعد التسليم {formatDate(task.deadline)}</span>
            <DueText status={task.status} deadline={task.deadline} today={today} />
          </span>
        }
        actions={
          <>
            {open ? (
              <form action={setTaskStatus.bind(null, task.id, 'done')}>
                <button className={btn.primary}>✓ تحديد كمنجزة</button>
              </form>
            ) : (
              <form action={setTaskStatus.bind(null, task.id, 'in_progress')}>
                <button className={btn.secondary}>إعادة فتح المهمة</button>
              </form>
            )}
            {task.status === 'not_started' && (
              <form action={setTaskStatus.bind(null, task.id, 'in_progress')}>
                <button className={btn.secondary}>بدء التنفيذ</button>
              </form>
            )}
          </>
        }
      />

      {copied && (
        <div className="mb-4">
          <Alert kind="success">تم إنشاء نسخة من المهمة. عدّل العنوان والموعد ثم احفظ.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">تعديل المهمة</h2>
          <TaskForm task={task} companies={companies} defaultDeadline={task.deadline} orgReminderDays={org.reminder_days} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-semibold">السجل</h2>
            <dl className="space-y-2 text-slate-600">
              <div>
                <dt className="text-xs text-slate-400">أُنشئت</dt>
                <dd>
                  {formatDateTime(task.created_at, org.timezone)}
                  {task.created_by_name && ` — ${task.created_by_name}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">آخر تعديل</dt>
                <dd>
                  {formatDateTime(task.updated_at, org.timezone)}
                  {task.updated_by_name && ` — ${task.updated_by_name}`}
                </dd>
              </div>
              {task.completed_at && (
                <div>
                  <dt className="text-xs text-slate-400">أُنجزت</dt>
                  <dd className="text-emerald-700">{formatDateTime(task.completed_at, org.timezone)}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card className="space-y-2 p-5">
            <form action={duplicateTask.bind(null, task.id)}>
              <button className={`${btn.secondary} w-full`}>نسخ المهمة</button>
            </form>
            <ConfirmButton
              action={deleteTask.bind(null, task.id)}
              confirmText="هل تريد حذف هذه المهمة نهائيًا؟"
              className={`${btn.danger} w-full`}
            >
              حذف المهمة
            </ConfirmButton>
          </Card>
        </div>
      </div>
    </>
  )
}
