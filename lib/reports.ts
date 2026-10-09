import 'server-only'
import { OPEN_SQL } from '@/lib/labels'
import { query } from './db'
import type { Org, TaskStatus } from './types'

/*
 Per-company report over tasks whose DEADLINE falls in [from, to]:
  - done_on_time : done, completed on or before the deadline (completion date in the org's time zone)
  - done_late    : done after the deadline
  - overdue      : still open and the deadline has passed
  - on_time_rate : done_on_time / (done + overdue). Tasks still open and not yet due, and cancelled ones, are not counted.
*/

export type CompanyReportRow = {
  company_id: string
  company_name: string
  total: number
  done: number
  done_on_time: number
  done_late: number
  open: number
  overdue: number
  cancelled: number
  on_time_rate: number | null
}

export async function companyReport(org: Pick<Org, 'id' | 'timezone'>, from: string, to: string, today: string, companyId?: string) {
  const rows = await query<Omit<CompanyReportRow, 'on_time_rate'>>(
    `select c.id as company_id, c.name as company_name,
            count(t.id)::int as total,
            count(t.id) filter (where t.status = 'done')::int as done,
            count(t.id) filter (where t.status = 'done' and (t.completed_at at time zone $4)::date <= t.deadline)::int as done_on_time,
            count(t.id) filter (where t.status = 'done' and (t.completed_at at time zone $4)::date > t.deadline)::int as done_late,
            count(t.id) filter (where t.status in ${OPEN_SQL})::int as open,
            count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $5)::int as overdue,
            count(t.id) filter (where t.status = 'cancelled')::int as cancelled
       from companies c
       join tasks t on t.company_id = c.id and t.deadline between $2 and $3
      where c.org_id = $1 and ($6::uuid is null or c.id = $6)
      group by c.id
      order by count(t.id) filter (where t.status in ${OPEN_SQL} and t.deadline < $5) desc, c.name`,
    [org.id, from, to, org.timezone, today, companyId ?? null],
  )
  return rows.map((r) => ({ ...r, on_time_rate: rate(r.done_on_time, r.done + r.overdue) }))
}

export const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null)

export function totals(rows: CompanyReportRow[]): Omit<CompanyReportRow, 'company_id' | 'company_name'> {
  const sum = (k: keyof CompanyReportRow) => rows.reduce((a, r) => a + (r[k] as number), 0)
  const t = {
    total: sum('total'),
    done: sum('done'),
    done_on_time: sum('done_on_time'),
    done_late: sum('done_late'),
    open: sum('open'),
    overdue: sum('overdue'),
    cancelled: sum('cancelled'),
  }
  return { ...t, on_time_rate: rate(t.done_on_time, t.done + t.overdue) }
}

export type CompletedRow = {
  id: string
  title: string
  company_name: string
  deadline: string
  completed_on: string
  assignees: string
  status: TaskStatus
}

/** Tasks completed between from and to (by completion date). */
export async function completedTasks(org: Pick<Org, 'id' | 'timezone'>, from: string, to: string, companyId?: string) {
  return query<CompletedRow>(
    `select t.id, t.title, c.name as company_name, t.deadline, t.status,
            to_char((t.completed_at at time zone $4)::date, 'YYYY-MM-DD') as completed_on,
            coalesce((select string_agg(u.full_name, '، ' order by u.full_name)
                        from task_assignees a join users u on u.id = a.user_id where a.task_id = t.id), '') as assignees
       from tasks t join companies c on c.id = t.company_id
      where t.org_id = $1 and t.status = 'done'
        and (t.completed_at at time zone $4)::date between $2 and $3
        and ($5::uuid is null or t.company_id = $5)
      order by t.completed_at desc
      limit 2000`,
    [org.id, from, to, org.timezone, companyId ?? null],
  )
}
