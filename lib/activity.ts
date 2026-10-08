import 'server-only'
import { query } from './db'
import { formatDate } from './dates'
import { FREQ_LABEL, PRIORITY_LABEL, STATUS_LABEL } from './labels'
import type { RecurrenceFreq, TaskPriority, TaskStatus } from './types'

/*
 Task activity history (السجل). Every change to a task writes one row; the task page renders them in Arabic.
 user_id null = done automatically by the system (e.g. a recurring task created on schedule).
*/

export type ActivityAction =
  | 'created'
  | 'created_recurring'
  | 'duplicated'
  | 'status'
  | 'title'
  | 'deadline'
  | 'priority'
  | 'company'
  | 'description'
  | 'reminder_days'
  | 'assignees'
  | 'checklist_add'
  | 'checklist_done'
  | 'checklist_undone'
  | 'checklist_delete'
  | 'recurrence_start'
  | 'recurrence_stop'

type Details = Record<string, unknown>

export async function logActivity(
  a: { orgId: string; taskId: string; userId: string | null; action: ActivityAction; details?: Details },
  client?: { query: (text: string, params: unknown[]) => Promise<unknown> },
) {
  const sql = 'insert into task_activity (org_id, task_id, user_id, action, details) values ($1,$2,$3,$4,$5)'
  const params = [a.orgId, a.taskId, a.userId, a.action, JSON.stringify(a.details ?? {})]
  if (client) await client.query(sql, params)
  else await query(sql, params)
}

const q = (s: unknown) => `«${String(s ?? '')}»`
const list = (v: unknown) => (Array.isArray(v) ? v.join('، ') : '')

/** Arabic sentence for one history row (without the user's name, which the page shows separately). */
export function describeActivity(action: string, d: Details): string {
  switch (action) {
    case 'created':
      return 'أنشأ المهمة'
    case 'created_recurring':
      return `أنشأ المهمة تلقائيًا (مهمة متكررة) بموعد ${formatDate(String(d.deadline))}`
    case 'duplicated':
      return 'أنشأ المهمة كنسخة من مهمة أخرى'
    case 'status':
      return `غيّر الحالة من ${STATUS_LABEL[d.from as TaskStatus]} إلى ${STATUS_LABEL[d.to as TaskStatus]}`
    case 'title':
      return `غيّر العنوان من ${q(d.from)} إلى ${q(d.to)}`
    case 'deadline':
      return `غيّر موعد التسليم من ${formatDate(String(d.from))} إلى ${formatDate(String(d.to))}`
    case 'priority':
      return `غيّر الأولوية من ${PRIORITY_LABEL[d.from as TaskPriority]} إلى ${PRIORITY_LABEL[d.to as TaskPriority]}`
    case 'company':
      return `نقل المهمة من شركة ${q(d.from)} إلى ${q(d.to)}`
    case 'description':
      return 'عدّل الوصف'
    case 'reminder_days':
      return `غيّر التذكير إلى ${d.to === null ? 'الإعداد الافتراضي' : `${d.to} يوم قبل الموعد`}`
    case 'assignees': {
      const parts = []
      if (Array.isArray(d.added) && d.added.length) parts.push(`أضاف ${list(d.added)} كمسؤول`)
      if (Array.isArray(d.removed) && d.removed.length) parts.push(`أزال ${list(d.removed)} من المسؤولين`)
      return parts.join(' و') || 'عدّل المسؤولين'
    }
    case 'checklist_add':
      return `أضاف خطوة ${q(d.title)}`
    case 'checklist_done':
      return `أنجز خطوة ${q(d.title)}`
    case 'checklist_undone':
      return `ألغى إنجاز خطوة ${q(d.title)}`
    case 'checklist_delete':
      return `حذف خطوة ${q(d.title)}`
    case 'recurrence_start':
      return `جعل المهمة متكررة (${FREQ_LABEL[d.frequency as RecurrenceFreq] ?? ''})`
    case 'recurrence_stop':
      return 'أوقف تكرار المهمة'
    default:
      return action
  }
}
