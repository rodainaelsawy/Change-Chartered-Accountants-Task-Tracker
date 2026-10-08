import 'server-only'
import { query } from './db'
import { addDays } from './dates'
import { OPEN_STATUSES, PRIORITIES, STATUSES } from './labels'
import type { Task } from './types'

export type TaskFilters = {
  q?: string
  company?: string
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
         t.reminder_days, t.created_at, t.updated_at, t.completed_at
    from tasks t join companies c on c.id = t.company_id`

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
