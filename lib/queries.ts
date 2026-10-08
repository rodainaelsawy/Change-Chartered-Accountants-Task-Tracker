import 'server-only'
import { query } from './db'
import { addDays } from './dates'
import { OPEN_STATUSES, PRIORITIES, STATUSES } from './labels'
import type { Task } from './types'

export type TaskFilters = {
  q?: string
  company?: string
  assignee?: string // a user id
  status?: string // 'open' (default) | 'all' | 'closed' | a TaskStatus
  priority?: string
  due?: string // 'overdue' | 'today' | 'week' | 'later' | ''
  sort?: string // 'deadline' | 'company' | 'priority' | 'status' | 'created'
}

const SORTS: Record<string, string> = {
  deadline: 't.deadline asc, t.priority desc',
  company: 'c.name asc, t.deadline asc',
  priority: 't.priority desc, t.deadline asc',
  status: 't.status asc, t.deadline asc',
  created: 't.created_at desc',
}

export const TASK_SELECT = `
  select t.id, t.company_id, c.name as company_name, t.title, t.description, t.deadline, t.priority, t.status,
         t.reminder_days, t.created_at, t.updated_at, t.completed_at, t.series_id,
         coalesce((select json_agg(json_build_object('id', u.id, 'name', u.full_name) order by u.full_name)
                     from task_assignees a join users u on u.id = a.user_id where a.task_id = t.id), '[]') as assignees,
         (select count(*)::int from task_checklist_items i where i.task_id = t.id) as checklist_total,
         (select count(*)::int from task_checklist_items i where i.task_id = t.id and i.done) as checklist_done
    from tasks t join companies c on c.id = t.company_id`

/** SQL condition: task is assigned to the user in parameter `param`. */
export const assignedTo = (param: string) =>
  `exists (select 1 from task_assignees ax where ax.task_id = t.id and ax.user_id = ${param})`

export async function listTasks(orgId: string, f: TaskFilters, today: string, limit = 500): Promise<Task[]> {
  const where: string[] = ['t.org_id = $1']
  const params: unknown[] = [orgId]
  const p = (v: unknown) => {
    params.push(v)
    return `$${params.length}`
  }

  const status = f.status || 'open'
  if (status === 'open') where.push(`t.status in ('${OPEN_STATUSES.join("','")}')`)
  else if (status === 'closed') where.push(`t.status in ('done','cancelled')`)
  else if ((STATUSES as string[]).includes(status)) where.push(`t.status = ${p(status)}`)

  if (f.company) where.push(`t.company_id = ${p(f.company)}`)
  if (f.assignee && /^[0-9a-f-]{36}$/i.test(f.assignee)) where.push(assignedTo(p(f.assignee)))
  if (f.priority && (PRIORITIES as string[]).includes(f.priority)) where.push(`t.priority = ${p(f.priority)}`)

  if (f.due === 'overdue') where.push(`t.deadline < ${p(today)} and t.status in ('${OPEN_STATUSES.join("','")}')`)
  else if (f.due === 'today') where.push(`t.deadline = ${p(today)}`)
  else if (f.due === 'week') where.push(`t.deadline between ${p(today)} and ${p(addDays(today, 7))}`)
  else if (f.due === 'later') where.push(`t.deadline > ${p(addDays(today, 7))}`)

  if (f.q?.trim()) {
    const like = p(`%${f.q.trim()}%`)
    where.push(`(t.title ilike ${like} or t.description ilike ${like} or c.name ilike ${like} or c.activity ilike ${like})`)
  }

  const order = SORTS[f.sort || 'deadline'] ?? SORTS.deadline
  return query<Task>(`${TASK_SELECT} where ${where.join(' and ')} order by ${order} limit ${limit}`, params)
}

export async function companyOptions(orgId: string, includeId?: string) {
  return query<{ id: string; name: string }>(
    `select id, name from companies where org_id = $1 and (archived_at is null or id = $2) order by name`,
    [orgId, includeId ?? null],
  )
}

export async function teamMembers(orgId: string) {
  return query<{ id: string; full_name: string; active: boolean }>(
    'select id, full_name, active from users where org_id = $1 order by active desc, full_name',
    [orgId],
  )
}

/** Reads the task-list filters from URL search params (shared by the tasks page and the Excel export). */
export function parseTaskFilters(get: (k: string) => string, userId: string): TaskFilters {
  return {
    q: get('q'),
    company: get('company'),
    assignee: get('assignee') === 'me' ? userId : get('assignee'),
    status: get('status') || 'open',
    priority: get('priority'),
    due: get('due'),
    sort: get('sort') || 'deadline',
  }
}
