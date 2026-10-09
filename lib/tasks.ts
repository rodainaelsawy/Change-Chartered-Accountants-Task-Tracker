import 'server-only'
import type pg from 'pg'
import { logActivity } from './activity'
import type { RecurrenceFreq, TaskPriority, TaskStatus } from './types'

export type NewTask = {
  companyId: string
  title: string
  deadline: string
  priority: TaskPriority
  status?: TaskStatus
  description?: string | null
  reminderDays?: number | null
  assigneeIds: string[]
  followerIds?: string[]
  checklist?: string[]
  recurrence?: RecurrenceFreq | null
}

/**
 Inserts one task with its assignees, checklist and (optional) recurrence, and logs "created".
 Must run inside a transaction (`tx`). Callers then run notifyAssigned (+ notifyUsers 'followed') + syncNotifications for the new id.
 Validation (company/users belong to the org, mandatory fields) is the caller's job.
*/
export async function insertTask(
  c: pg.PoolClient,
  ctx: { orgId: string; userId: string },
  t: NewTask,
  activityDetails?: Record<string, unknown>,
): Promise<string> {
  let seriesId: string | null = null
  if (t.recurrence) {
    const s = await c.query(
      'insert into task_series (org_id, frequency, anchor_date, created_by) values ($1,$2,$3,$4) returning id',
      [ctx.orgId, t.recurrence, t.deadline, ctx.userId],
    )
    seriesId = s.rows[0].id
  }
  const r = await c.query(
    `insert into tasks (org_id, company_id, title, deadline, priority, status, description, reminder_days,
                        created_by, updated_by, series_id, occurrence_no)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11) returning id`,
    [
      ctx.orgId,
      t.companyId,
      t.title,
      t.deadline,
      t.priority,
      t.status ?? 'not_started',
      t.description ?? null,
      t.reminderDays ?? null,
      ctx.userId,
      seriesId,
      seriesId ? 0 : null,
    ],
  )
  const id = r.rows[0].id as string
  await c.query('insert into task_assignees (task_id, user_id) select $1, unnest($2::uuid[]) on conflict do nothing', [id, t.assigneeIds])
  if (t.followerIds?.length)
    await c.query('insert into task_followers (task_id, user_id) select $1, unnest($2::uuid[]) on conflict do nothing', [id, t.followerIds])
  for (const [i, item] of (t.checklist ?? []).entries())
    await c.query('insert into task_checklist_items (task_id, title, position) values ($1,$2,$3)', [id, item, i])
  await logActivity({ orgId: ctx.orgId, taskId: id, userId: ctx.userId, action: 'created', details: activityDetails }, c)
  if (t.recurrence)
    await logActivity(
      { orgId: ctx.orgId, taskId: id, userId: ctx.userId, action: 'recurrence_start', details: { frequency: t.recurrence } },
      c,
    )
  return id
}

export const splitLines = (s: string, max = 100) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max)
