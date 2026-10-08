import { notFound } from 'next/navigation'
import { SideTips } from '@/components/side-tips'
import { TaskForm } from '@/components/task-form'
import { Card, Crumbs, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { todayIn } from '@/lib/dates'
import { companyOptions, teamMembers } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const metadata = { title: 'تعديل المهمة' }

/** Edit page for a task: same pattern as the company edit page (save/cancel return to the task's page). */
export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const task = await one<Task>(
    'select t.*, c.name as company_name from tasks t join companies c on c.id = t.company_id where t.id = $1 and t.org_id = $2',
    [id, org.id],
  )
  if (!task) notFound()
  const [companies, team, assignees] = await Promise.all([
    companyOptions(org.id, task.company_id),
    teamMembers(org.id),
    query<{ user_id: string }>('select user_id from task_assignees where task_id = $1', [id]),
  ])

  return (
    <>
      <Crumbs
        items={[
          { href: '/tasks', label: 'المهام' },
          { href: `/tasks/${id}`, label: task.title },
        ]}
      />
      <PageHeader title="تعديل المهمة" subtitle={task.company_name} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <TaskForm
            task={task}
            companies={companies}
            team={team}
            assigneeIds={assignees.map((a) => a.user_id)}
            defaultDeadline={task.deadline}
            orgReminderDays={org.reminder_days}
            today={todayIn(org.timezone)}
            cancelHref={`/tasks/${id}`}
          />
        </Card>
        <SideTips
          items={[
            'بعد الحفظ أو الإلغاء تعود لصفحة المهمة.',
            task.series_id
              ? 'هذه مهمة متكررة: تغيير الموعد هنا يخص هذه المرة فقط، والمرات القادمة تُحسب من أول موعد.'
              : 'يمكنك جعل المهمة متكررة من حقل «التكرار».',
            'الخطوات والتعليقات تُدار من صفحة المهمة مباشرة.',
            'إضافة مسؤول جديد ترسل له تنبيه «أُسندت إليك مهمة».',
          ]}
          links={[{ href: `/tasks/${id}`, label: 'العودة لصفحة المهمة' }]}
        />
      </div>
    </>
  )
}
