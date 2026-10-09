'use server'

import { requireManager } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession, type Session } from '@/lib/auth'
import { one, query, tx } from '@/lib/db'
import { addDays } from '@/lib/dates'
import { PRIORITIES, companiesCount, tasksCount } from '@/lib/labels'
import { notifyAssigned, syncNotifications } from '@/lib/reminders'
import { insertTask, splitLines, type NewTask } from '@/lib/tasks'
import type { RecurrenceFreq, TaskPriority } from '@/lib/types'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const all = (fd: FormData, k: string) => fd.getAll(k).map((v) => String(v).trim())
const UUID = /^[0-9a-f-]{36}$/i
const FREQS: RecurrenceFreq[] = ['weekly', 'monthly', 'quarterly', 'yearly']
const DATE = /^\d{4}-\d{2}-\d{2}$/

async function validAssignees(orgId: string, fd: FormData) {
  const ids = [...new Set(all(fd, 'assignees').filter((v) => UUID.test(v)))]
  if (!ids.length) return { error: 'اختر مسؤولًا واحدًا على الأقل' as const }
  const n = await one<{ n: number }>(
    'select count(*)::int as n from users where org_id = $1 and active and id = any($2::uuid[])',
    [orgId, ids],
  )
  if (n!.n !== ids.length) return { error: 'أحد المسؤولين غير موجود' as const }
  return { ids }
}

/** Notifications for freshly created tasks (outside the transaction). */
async function afterCreate(org: Session['org'], userId: string, ids: string[], assigneeIds: string[]) {
  for (const id of ids) {
    await notifyAssigned(org, id, assigneeIds, userId)
    await syncNotifications(org, id)
  }
  revalidatePath('/', 'layout')
}

// ---------- Templates ----------

export async function saveTemplate(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireManager()
  const id = str(fd, 'id')
  const name = str(fd, 'name')
  const description = str(fd, 'description') || null
  const titles = all(fd, 'item_title')
  const offsets = all(fd, 'item_offset')
  const priorities = all(fd, 'item_priority')
  const recurrences = all(fd, 'item_recurrence')
  const checklists = fd.getAll('item_checklist').map(String)

  if (!name) return { error: 'اسم القالب مطلوب' }
  if (!titles.length) return { error: 'أضف مهمة واحدة على الأقل للقالب' }
  const items = titles.map((title, i) => ({
    title,
    offset: offsets[i] === '' || offsets[i] === undefined ? 0 : Number(offsets[i]),
    priority: (priorities[i] || 'medium') as TaskPriority,
    recurrence: (recurrences[i] || null) as RecurrenceFreq | null,
    checklist: splitLines(checklists[i] ?? '').join('\n'),
  }))
  for (const [i, it] of items.entries()) {
    if (!it.title) return { error: `عنوان المهمة رقم ${i + 1} مطلوب` }
    if (!Number.isInteger(it.offset) || it.offset < 0 || it.offset > 3650)
      return { error: `عدد الأيام في المهمة رقم ${i + 1} يجب أن يكون بين 0 و 3650` }
    if (!PRIORITIES.includes(it.priority)) return { error: 'الأولوية غير صحيحة' }
    if (it.recurrence && !FREQS.includes(it.recurrence)) return { error: 'نوع التكرار غير صحيح' }
  }

  const templateId = await tx(async (c) => {
    let tid = id
    if (id) {
      const r = await c.query(
        'update task_templates set name = $3, description = $4, updated_at = now() where id = $1 and org_id = $2 returning id',
        [id, org.id, name, description],
      )
      if (!r.rows.length) return null
      await c.query('delete from task_template_items where template_id = $1', [id])
    } else {
      const r = await c.query(
        'insert into task_templates (org_id, name, description, created_by) values ($1,$2,$3,$4) returning id',
        [org.id, name, description, user.id],
      )
      tid = r.rows[0].id
    }
    for (const [i, it] of items.entries())
      await c.query(
        `insert into task_template_items (template_id, title, offset_days, priority, recurrence, checklist, position)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [tid, it.title, it.offset, it.priority, it.recurrence, it.checklist, i],
      )
    return tid
  })
  if (!templateId) return { error: 'القالب غير موجود' }
  revalidatePath('/templates')
  redirect(`/templates/${templateId}?msg=template_saved`)
}

export async function deleteTemplate(id: string) {
  const { org } = await requireManager()
  await query('delete from task_templates where id = $1 and org_id = $2', [id, org.id])
  revalidatePath('/templates')
  redirect('/templates?msg=template_deleted')
}

/** Creates all of a template's tasks for each selected company. */
export async function applyTemplate(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireSession()
  const templateId = str(fd, 'template_id')
  const start = str(fd, 'start_date')
  const companyIds = [...new Set(all(fd, 'companies').filter((v) => UUID.test(v)))]
  if (!DATE.test(start)) return { error: 'تاريخ البداية مطلوب' }
  if (!companyIds.length) return { error: 'اختر شركة واحدة على الأقل' }
  const a = await validAssignees(org.id, fd)
  if ('error' in a) return { error: a.error }

  const template = await one<{ name: string }>('select name from task_templates where id = $1 and org_id = $2', [
    UUID.test(templateId) ? templateId : null,
    org.id,
  ])
  if (!template) return { error: 'القالب غير موجود' }
  const items = await query<{ title: string; offset_days: number; priority: TaskPriority; recurrence: RecurrenceFreq | null; checklist: string }>(
    'select title, offset_days, priority, recurrence, checklist from task_template_items where template_id = $1 order by position',
    [templateId],
  )
  const companies = await query<{ id: string }>(
    'select id from companies where org_id = $1 and id = any($2::uuid[]) and archived_at is null',
    [org.id, companyIds],
  )
  if (companies.length !== companyIds.length) return { error: 'إحدى الشركات غير موجودة' }

  const ids = await tx(async (c) => {
    const out: string[] = []
    for (const co of companies)
      for (const it of items)
        out.push(
          await insertTask(
            c,
            { orgId: org.id, userId: user.id },
            {
              companyId: co.id,
              title: it.title,
              deadline: addDays(start, it.offset_days),
              priority: it.priority,
              assigneeIds: a.ids,
              checklist: splitLines(it.checklist),
              recurrence: it.recurrence,
            },
            { template: template.name },
          ),
        )
    return out
  })
  await afterCreate(org, user.id, ids, a.ids)
  return {
    ok: `تم إنشاء ${tasksCount(ids.length)} (${tasksCount(items.length)} × ${companiesCount(companies.length)}).`,
  }
}

// ---------- Bulk add ----------

/** Adds several tasks for one company at once (rows of title / deadline / priority). */
export async function bulkAddTasks(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireSession()
  const companyId = str(fd, 'company_id')
  const titles = all(fd, 'row_title')
  const deadlines = all(fd, 'row_deadline')
  const priorities = all(fd, 'row_priority')
  if (!UUID.test(companyId)) return { error: 'اختر الشركة' }
  const company = await one('select 1 from companies where id = $1 and org_id = $2', [companyId, org.id])
  if (!company) return { error: 'الشركة غير موجودة' }
  const a = await validAssignees(org.id, fd)
  if ('error' in a) return { error: a.error }

  const rows: NewTask[] = []
  for (const [i, title] of titles.entries()) {
    const deadline = deadlines[i] ?? ''
    const priority = (priorities[i] || 'medium') as TaskPriority
    if (!title) continue // rows without a title are ignored
    if (!DATE.test(deadline)) return { error: `موعد التسليم في الصف ${i + 1} مطلوب` }
    if (!PRIORITIES.includes(priority)) return { error: 'الأولوية غير صحيحة' }
    rows.push({ companyId, title, deadline, priority, assigneeIds: a.ids })
  }
  if (!rows.length) return { error: 'أضف مهمة واحدة على الأقل' }
  if (rows.length > 200) return { error: 'الحد الأقصى 200 مهمة في المرة الواحدة' }

  const ids = await tx(async (c) => {
    const out: string[] = []
    for (const r of rows) out.push(await insertTask(c, { orgId: org.id, userId: user.id }, r))
    return out
  })
  await afterCreate(org, user.id, ids, a.ids)
  redirect(`/companies/${companyId}?added=${ids.length}`)
}
