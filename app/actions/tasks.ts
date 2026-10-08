'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { PRIORITIES, STATUSES, isOpen } from '@/lib/labels'
import { clearTaskNotifications, syncNotifications } from '@/lib/reminders'
import type { TaskPriority, TaskStatus } from '@/lib/types'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

async function afterChange(org: Parameters<typeof syncNotifications>[0], taskId: string, status: TaskStatus) {
  if (isOpen(status)) await syncNotifications(org, taskId)
  else await clearTaskNotifications(taskId)
  revalidatePath('/', 'layout')
}

/** Create (no id) or update (id) a task. */
export async function saveTask(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireSession()
  const id = str(fd, 'id')
  const title = str(fd, 'title')
  const companyId = str(fd, 'company_id')
  const deadline = str(fd, 'deadline')
  const priority = str(fd, 'priority') as TaskPriority
  const status = (str(fd, 'status') || 'not_started') as TaskStatus
  const description = str(fd, 'description') || null
  const rd = str(fd, 'reminder_days')
  const reminderDays = rd === '' ? null : Number(rd)

  if (!title) return { error: 'عنوان المهمة مطلوب' }
  if (!companyId) return { error: 'اختر الشركة' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: 'موعد التسليم مطلوب' }
  if (!PRIORITIES.includes(priority)) return { error: 'الأولوية غير صحيحة' }
  if (!STATUSES.includes(status)) return { error: 'الحالة غير صحيحة' }
  if (reminderDays !== null && (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 60))
    return { error: 'أيام التذكير يجب أن تكون بين 0 و 60' }

  const company = await one('select 1 from companies where id = $1 and org_id = $2', [companyId, org.id])
  if (!company) return { error: 'الشركة غير موجودة' }

  let taskId = id
  if (id) {
    const r = await query(
      `update tasks set title=$3, company_id=$4, deadline=$5, priority=$6, status=$7, description=$8, reminder_days=$9, updated_by=$10
        where id = $1 and org_id = $2 returning id`,
      [id, org.id, title, companyId, deadline, priority, status, description, reminderDays, user.id],
    )
    if (!r.length) return { error: 'المهمة غير موجودة' }
    // Deadline may have moved: drop unread reminders that no longer apply, then recreate the right ones.
    await query(`delete from notifications where task_id = $1 and read_at is null and kind <> 'overdue'`, [id])
  } else {
    const r = (await one<{ id: string }>(
      `insert into tasks (org_id, company_id, title, deadline, priority, status, description, reminder_days, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning id`,
      [org.id, companyId, title, deadline, priority, status, description, reminderDays, user.id],
    ))!
    taskId = r.id
  }
  await afterChange(org, taskId, status)

  const next = str(fd, 'next')
  if (str(fd, 'again') === '1') redirect(`/tasks/new?company=${companyId}&added=1`)
  redirect(next.startsWith('/') ? next : `/tasks/${taskId}`)
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const { user, org } = await requireSession()
  if (!STATUSES.includes(status)) return
  const r = await query('update tasks set status = $3, updated_by = $4 where id = $1 and org_id = $2 returning id', [
    id,
    org.id,
    status,
    user.id,
  ])
  if (r.length) await afterChange(org, id, status)
}

export async function duplicateTask(id: string) {
  const { user, org } = await requireSession()
  const r = await one<{ id: string }>(
    `insert into tasks (org_id, company_id, title, description, deadline, priority, status, reminder_days, created_by, updated_by)
     select org_id, company_id, title || ' (نسخة)', description, deadline, priority, 'not_started', reminder_days, $3, $3
       from tasks where id = $1 and org_id = $2 returning id`,
    [id, org.id, user.id],
  )
  if (!r) redirect('/tasks')
  await afterChange(org, r.id, 'not_started')
  redirect(`/tasks/${r.id}?copied=1`)
}

export async function deleteTask(id: string) {
  const { org } = await requireSession()
  await query('delete from tasks where id = $1 and org_id = $2', [id, org.id])
  revalidatePath('/', 'layout')
  redirect('/tasks')
}
