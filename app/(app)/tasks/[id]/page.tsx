import { notFound } from 'next/navigation'
import { deleteTask, duplicateTask, stopRecurrence } from '@/app/actions/tasks'
import { ConfirmButton } from '@/components/action-form'
import { TaskChecklist, type ChecklistItem } from '@/components/task-checklist'
import { TaskComments } from '@/components/task-comments'
import { TaskForm } from '@/components/task-form'
import { SubmitButton } from '@/components/submit-button'
import { Card, Crumbs, DueText, PageHeader, StatusBadge, btn } from '@/components/ui'
import { describeActivity } from '@/lib/activity'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { formatDate, formatDateTime, todayIn } from '@/lib/dates'
import { FREQ_LABEL } from '@/lib/labels'
import { companyOptions, teamMembers } from '@/lib/queries'
import type { RecurrenceFreq, Task } from '@/lib/types'

export const metadata = { title: 'تفاصيل المهمة' }

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { org, user } = await requireSession()
  const { id } = await params
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

  const [companies, team, assignees, checklist, comments, activity, series] = await Promise.all([
    companyOptions(org.id, task.company_id),
    teamMembers(org.id),
    query<{ id: string; full_name: string; active: boolean }>(
      'select u.id, u.full_name, u.active from task_assignees a join users u on u.id = a.user_id where a.task_id = $1 order by u.full_name',
      [id],
    ),
    query<ChecklistItem>(
      `select i.id, i.title, i.done, u.full_name as done_by_name
         from task_checklist_items i left join users u on u.id = i.done_by
        where i.task_id = $1 order by i.position, i.created_at`,
      [id],
    ),
    query<{ id: string; body: string; user_id: string | null; author: string | null; created_at: Date; updated_at: Date | null }>(
      `select c.id, c.body, c.user_id, u.full_name as author, c.created_at, c.updated_at
         from task_comments c left join users u on u.id = c.user_id
        where c.task_id = $1 order by c.created_at`,
      [id],
    ),
    query<{ id: string; action: string; details: Record<string, unknown>; who: string | null; user_id: string | null; created_at: Date }>(
      `select a.id, a.action, a.details, a.user_id, u.full_name as who, a.created_at
         from task_activity a left join users u on u.id = a.user_id
        where a.task_id = $1 order by a.created_at desc, a.id desc limit 100`,
      [id],
    ),
    task.series_id
      ? one<{ frequency: RecurrenceFreq; active: boolean }>('select frequency, active from task_series where id = $1', [task.series_id])
      : Promise.resolve(null),
  ])

  const today = todayIn(org.timezone)

  return (
    <>
      <Crumbs items={[{ href: '/tasks', label: 'المهام' }, { href: `/companies/${task.company_id}`, label: task.company_name }]} />
      <PageHeader
        title={task.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <span>موعد التسليم {formatDate(task.deadline)}</span>
            <DueText status={task.status} deadline={task.deadline} today={today} />
            {series && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800">↻ {FREQ_LABEL[series.frequency]}</span>}
          </span>
        }
        actions={<div id="task-form-actions" className="flex flex-wrap items-center gap-2" />}
      />


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <TaskForm
              key={String(task.updated_at)}
              task={task}
              companies={companies}
              team={team}
              assigneeIds={assignees.map((a) => a.id)}
              defaultDeadline={task.deadline}
              orgReminderDays={org.reminder_days}
              today={today}
              next="/tasks?msg=task_saved"
              cancelHref="/tasks"
              actionsTarget="task-form-actions"
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">خطوات المهمة</h2>
            <TaskChecklist taskId={task.id} items={checklist} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">التعليقات ({comments.length})</h2>
            <TaskComments
              taskId={task.id}
              comments={comments.map((c) => ({
                id: c.id,
                body: c.body,
                author: c.author,
                mine: c.user_id === user.id,
                canDelete: c.user_id === user.id || user.role === 'admin',
                when: formatDateTime(c.created_at, org.timezone),
                edited: Boolean(c.updated_at),
              }))}
            />
          </Card>

        </div>

        <div className="space-y-4">
          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-semibold">معلومات</h2>
            <dl className="space-y-3 text-slate-600">
              {series && (
                <div>
                  <dt className="text-xs text-slate-400">التكرار</dt>
                  <dd>
                    {series.active ? (
                      <>
                        {FREQ_LABEL[series.frequency]} — تُنشأ المرة التالية تلقائيًا عند الإنجاز أو حلول الموعد.
                        <ConfirmButton
                          action={stopRecurrence.bind(null, task.id)}
                          confirmText="إيقاف التكرار؟ لن تُنشأ مهام جديدة من هذه السلسلة (المهام الموجودة تبقى كما هي)."
                          className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          إيقاف التكرار
                        </ConfirmButton>
                      </>
                    ) : (
                      <span className="text-slate-400">تم إيقاف التكرار</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-400">أُنشئت</dt>
                <dd>
                  {formatDateTime(task.created_at, org.timezone)}
                  {task.created_by_name ? ` — ${task.created_by_name}` : series ? ' — تلقائيًا' : ''}
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

          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-semibold">السجل</h2>
            {activity.length === 0 ? (
              <p className="text-slate-500">لا يوجد سجل بعد.</p>
            ) : (
              <ol className="relative space-y-3 border-s border-slate-200 ps-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -start-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                    <p className="text-slate-700">
                      <span className="font-medium">{a.user_id ? (a.who ?? 'مستخدم محذوف') : 'النظام'}</span>{' '}
                      {describeActivity(a.action, a.details)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.created_at, org.timezone)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="space-y-2 p-5">
            <form action={duplicateTask.bind(null, task.id)}>
              <SubmitButton className={`${btn.secondary} w-full`}>نسخ المهمة</SubmitButton>
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
