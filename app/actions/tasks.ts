'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/activity'
import { requireSession, type Session } from '@/lib/auth'
import { one, query, tx } from '@/lib/db'
import { PRIORITIES, STATUSES, isOpen } from '@/lib/labels'
import { ensureNextOccurrences } from '@/lib/recurrence'
import { clearTaskNotifications, notifyAssigned, syncNotifications } from '@/lib/reminders'
import { insertTask, splitLines } from '@/lib/tasks'
import type { RecurrenceFreq, TaskPriority, TaskStatus } from '@/lib/types'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const FREQS: RecurrenceFreq[] = ['weekly', 'monthly', 'quarterly', 'yearly']
const UUID = /^[0-9a-f-]{36}$/i

async function afterChange(org: Session['org'], taskId: string, status: TaskStatus) {
  if (isOpen(status)) await syncNotifications(org, taskId)
  else await clearTaskNotifications(taskId)
}

/** When a recurring occurrence is closed, its next occurrence is created right away (option "a"). */
async function advanceSeries(org: Session['org'], taskId: string) {
  const t = await one<{ series_id: string | null }>('select series_id from tasks where id = $1', [taskId])
  if (!t?.series_id) return
  for (const id of await ensureNextOccurrences(org, t.series_id)) await syncNotifications(org, id)
}

async function taskInOrg(taskId: string, orgId: string) {
  if (!UUID.test(taskId)) return null
  return one<{ id: string; status: TaskStatus; title: string; series_id: string | null }>(
    'select id, status, title, series_id from tasks where id = $1 and org_id = $2',
    [taskId, orgId],
  )
}

/** Create (no id) or update (id) a task, with its assignees and (on create) checklist and recurrence. */
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
  const assigneeIds = [...new Set(fd.getAll('assignees').map(String).filter((v) => UUID.test(v)))]
  const recurrence = str(fd, 'recurrence') as RecurrenceFreq | ''
  const checklist = splitLines(str(fd, 'checklist'))

  if (!title) return { error: 'عنوان المهمة مطلوب' }
  if (!companyId) return { error: 'اختر الشركة' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: 'موعد التسليم مطلوب' }
  if (!PRIORITIES.includes(priority)) return { error: 'الأولوية غير صحيحة' }
  if (!STATUSES.includes(status)) return { error: 'الحالة غير صحيحة' }
  if (reminderDays !== null && (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 60))
    return { error: 'أيام التذكير يجب أن تكون بين 0 و 60' }
  if (!assigneeIds.length) return { error: 'اختر مسؤولًا واحدًا على الأقل' }
  if (recurrence && !FREQS.includes(recurrence)) return { error: 'نوع التكرار غير صحيح' }

  const company = await one<{ name: string }>('select name from companies where id = $1 and org_id = $2', [companyId, org.id])
  if (!company) return { error: 'الشركة غير موجودة' }
  const validUsers = await query<{ id: string; full_name: string }>(
    'select id, full_name from users where org_id = $1 and id = any($2::uuid[])',
    [org.id, assigneeIds],
  )
  if (validUsers.length !== assigneeIds.length) return { error: 'أحد المسؤولين غير موجود' }
  const nameOf = (uid: string) => validUsers.find((u) => u.id === uid)?.full_name ?? ''

  let taskId = id
  let newlyAssigned: string[] = []

  if (id) {
    const old = await one<{
      title: string
      company_id: string
      company_name: string
      deadline: string
      priority: TaskPriority
      status: TaskStatus
      description: string | null
      reminder_days: number | null
      series_id: string | null
    }>(
      `select t.title, t.company_id, c.name as company_name, t.deadline, t.priority, t.status, t.description,
              t.reminder_days, t.series_id
         from tasks t join companies c on c.id = t.company_id where t.id = $1 and t.org_id = $2`,
      [id, org.id],
    )
    if (!old) return { error: 'المهمة غير موجودة' }
    const oldAssignees = (
      await query<{ user_id: string; full_name: string }>(
        'select a.user_id, u.full_name from task_assignees a join users u on u.id = a.user_id where a.task_id = $1',
        [id],
      )
    )
    const oldIds = oldAssignees.map((a) => a.user_id)
    newlyAssigned = assigneeIds.filter((u) => !oldIds.includes(u))
    const removed = oldAssignees.filter((a) => !assigneeIds.includes(a.user_id))

    await tx(async (c) => {
      await c.query(
        `update tasks set title=$3, company_id=$4, deadline=$5, priority=$6, status=$7, description=$8, reminder_days=$9, updated_by=$10
          where id = $1 and org_id = $2`,
        [id, org.id, title, companyId, deadline, priority, status, description, reminderDays, user.id],
      )
      await c.query('delete from task_assignees where task_id = $1 and not (user_id = any($2::uuid[]))', [id, assigneeIds])
      await c.query(
        'insert into task_assignees (task_id, user_id) select $1, unnest($2::uuid[]) on conflict do nothing',
        [id, assigneeIds],
      )
      const log = (action: Parameters<typeof logActivity>[0]['action'], details: Record<string, unknown>) =>
        logActivity({ orgId: org.id, taskId: id, userId: user.id, action, details }, c)
      if (old.title !== title) await log('title', { from: old.title, to: title })
      if (old.status !== status) await log('status', { from: old.status, to: status })
      if (old.deadline !== deadline) await log('deadline', { from: old.deadline, to: deadline })
      if (old.priority !== priority) await log('priority', { from: old.priority, to: priority })
      if (old.company_id !== companyId) await log('company', { from: old.company_name, to: company.name })
      if ((old.description ?? '') !== (description ?? '')) await log('description', {})
      if (old.reminder_days !== reminderDays) await log('reminder_days', { from: old.reminder_days, to: reminderDays })
      if (newlyAssigned.length || removed.length)
        await log('assignees', { added: newlyAssigned.map(nameOf), removed: removed.map((r) => r.full_name) })
      // Turning an existing (non-recurring) task into a recurring one: it becomes occurrence 0.
      if (recurrence && !old.series_id) {
        const s = await c.query(
          'insert into task_series (org_id, frequency, anchor_date, created_by) values ($1,$2,$3,$4) returning id',
          [org.id, recurrence, deadline, user.id],
        )
        await c.query('update tasks set series_id = $2, occurrence_no = 0 where id = $1', [id, s.rows[0].id])
        await log('recurrence_start', { frequency: recurrence })
      }
    })
    // Deadline or assignees may have changed: drop unread reminders that no longer apply, then recreate them.
    await query(`delete from notifications where task_id = $1 and read_at is null and kind not in ('overdue', 'assigned')`, [id])
    if (removed.length)
      await query('delete from notifications where task_id = $1 and read_at is null and user_id = any($2::uuid[])', [
        id,
        removed.map((r) => r.user_id),
      ])
  } else {
    newlyAssigned = assigneeIds
    taskId = await tx((c) =>
      insertTask(c, { orgId: org.id, userId: user.id }, {
        companyId,
        title,
        deadline,
        priority,
        status,
        description,
        reminderDays,
        assigneeIds,
        checklist,
        recurrence: recurrence || null,
      }),
    )
  }

  await notifyAssigned(org, taskId, newlyAssigned, user.id)
  await afterChange(org, taskId, status)
  if (!isOpen(status)) await advanceSeries(org, taskId)
  revalidatePath('/', 'layout')

  const next = str(fd, 'next')
  if (str(fd, 'again') === '1') redirect(`/tasks/new?company=${companyId}&added=1`)
  redirect(next.startsWith('/') ? next : `/tasks/${taskId}?msg=${id ? 'task_saved' : 'task_created'}`)
}

/** Changes a task's status and returns the previous one (so the UI can offer "تراجع" / undo). */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<TaskStatus | null> {
  const { user, org } = await requireSession()
  if (!STATUSES.includes(status)) return null
  const t = await taskInOrg(id, org.id)
  if (!t || t.status === status) return null
  await query('update tasks set status = $3, updated_by = $4 where id = $1 and org_id = $2', [id, org.id, status, user.id])
  await logActivity({ orgId: org.id, taskId: id, userId: user.id, action: 'status', details: { from: t.status, to: status } })
  await afterChange(org, id, status)
  if (!isOpen(status)) await advanceSeries(org, id)
  revalidatePath('/', 'layout')
  return t.status
}

/** Form-action variant of setTaskStatus (forms need a void return). */
export async function setStatusAction(id: string, status: TaskStatus) {
  await setTaskStatus(id, status)
}

export async function duplicateTask(id: string) {
  const { user, org } = await requireSession()
  const newId = await tx(async (c) => {
    const r = await c.query(
      `insert into tasks (org_id, company_id, title, description, deadline, priority, status, reminder_days, created_by, updated_by)
       select org_id, company_id, title || ' (نسخة)', description, deadline, priority, 'not_started', reminder_days, $3, $3
         from tasks where id = $1 and org_id = $2 returning id`,
      [id, org.id, user.id],
    )
    if (!r.rows.length) return null
    const nid = r.rows[0].id as string
    await c.query('insert into task_assignees (task_id, user_id) select $2, user_id from task_assignees where task_id = $1', [id, nid])
    await c.query(
      'insert into task_checklist_items (task_id, title, position) select $2, title, position from task_checklist_items where task_id = $1',
      [id, nid],
    )
    await logActivity({ orgId: org.id, taskId: nid, userId: user.id, action: 'duplicated' }, c)
    return nid
  })
  if (!newId) redirect('/tasks')
  await afterChange(org, newId, 'not_started')
  revalidatePath('/', 'layout')
  redirect(`/tasks/${newId}?msg=task_copied`)
}

export async function deleteTask(id: string) {
  const { org } = await requireSession()
  await query('delete from tasks where id = $1 and org_id = $2', [id, org.id])
  revalidatePath('/', 'layout')
  redirect('/tasks?msg=task_deleted')
}

export async function stopRecurrence(taskId: string) {
  const { user, org } = await requireSession()
  const t = await taskInOrg(taskId, org.id)
  if (!t?.series_id) return
  await query('update task_series set active = false where id = $1 and org_id = $2', [t.series_id, org.id])
  await logActivity({ orgId: org.id, taskId, userId: user.id, action: 'recurrence_stop' })
  revalidatePath(`/tasks/${taskId}`)
}

// ---------- Checklist ----------

export async function addChecklistItem(taskId: string, title: string): Promise<{ error?: string }> {
  const { user, org } = await requireSession()
  const t = await taskInOrg(taskId, org.id)
  const clean = title.trim().slice(0, 300)
  if (!t) return { error: 'المهمة غير موجودة' }
  if (!clean) return { error: 'اكتب نص الخطوة' }
  await query(
    `insert into task_checklist_items (task_id, title, position)
     values ($1, $2, coalesce((select max(position) + 1 from task_checklist_items where task_id = $1), 0))`,
    [taskId, clean],
  )
  await logActivity({ orgId: org.id, taskId, userId: user.id, action: 'checklist_add', details: { title: clean } })
  revalidatePath(`/tasks/${taskId}`)
  return {}
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const { user, org } = await requireSession()
  if (!UUID.test(itemId)) return
  const r = await one<{ task_id: string; title: string }>(
    `update task_checklist_items i set done = $2, done_by = case when $2 then $3::uuid end, done_at = case when $2 then now() end
       from tasks t where i.id = $1 and t.id = i.task_id and t.org_id = $4 and i.done <> $2
     returning i.task_id, i.title`,
    [itemId, done, user.id, org.id],
  )
  if (!r) return
  await logActivity({
    orgId: org.id,
    taskId: r.task_id,
    userId: user.id,
    action: done ? 'checklist_done' : 'checklist_undone',
    details: { title: r.title },
  })
  revalidatePath(`/tasks/${r.task_id}`)
}

export async function deleteChecklistItem(itemId: string) {
  const { user, org } = await requireSession()
  if (!UUID.test(itemId)) return
  const r = await one<{ task_id: string; title: string }>(
    `delete from task_checklist_items i using tasks t
      where i.id = $1 and t.id = i.task_id and t.org_id = $2 returning i.task_id, i.title`,
    [itemId, org.id],
  )
  if (!r) return
  await logActivity({ orgId: org.id, taskId: r.task_id, userId: user.id, action: 'checklist_delete', details: { title: r.title } })
  revalidatePath(`/tasks/${r.task_id}`)
}

// ---------- Comments ----------

export async function addComment(taskId: string, body: string): Promise<{ error?: string }> {
  const { user, org } = await requireSession()
  const t = await taskInOrg(taskId, org.id)
  const clean = body.trim().slice(0, 5000)
  if (!t) return { error: 'المهمة غير موجودة' }
  if (!clean) return { error: 'اكتب التعليق أولًا' }
  await query('insert into task_comments (org_id, task_id, user_id, body) values ($1,$2,$3,$4)', [org.id, taskId, user.id, clean])
  revalidatePath(`/tasks/${taskId}`)
  return {}
}

/** Only the author can edit a comment. */
export async function editComment(commentId: string, body: string): Promise<{ error?: string }> {
  const { user, org } = await requireSession()
  const clean = body.trim().slice(0, 5000)
  if (!UUID.test(commentId) || !clean) return { error: 'اكتب التعليق أولًا' }
  const r = await one<{ task_id: string }>(
    'update task_comments set body = $3, updated_at = now() where id = $1 and org_id = $2 and user_id = $4 returning task_id',
    [commentId, org.id, clean, user.id],
  )
  if (!r) return { error: 'لا يمكنك تعديل هذا التعليق' }
  revalidatePath(`/tasks/${r.task_id}`)
  return {}
}

/** The author (or an admin) can delete a comment. */
export async function deleteComment(commentId: string) {
  const { user, org } = await requireSession()
  if (!UUID.test(commentId)) return
  const r = await one<{ task_id: string }>(
    'delete from task_comments where id = $1 and org_id = $2 and (user_id = $3 or $4) returning task_id',
    [commentId, org.id, user.id, user.role === 'admin'],
  )
  if (r) revalidatePath(`/tasks/${r.task_id}`)
}
