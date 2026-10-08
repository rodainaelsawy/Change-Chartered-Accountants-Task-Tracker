import 'server-only'
import { logActivity } from './activity'
import { tx } from './db'
import { addDays, addMonthsClamped, todayIn } from './dates'
import type { Org, RecurrenceFreq } from './types'

/*
 Recurring tasks (option "a"): the next occurrence is created as soon as the latest one is done/cancelled
 OR its deadline arrives, whichever comes first.
 Occurrence n has deadline = anchor + n periods; periods whose deadline already passed are skipped, so a
 first deadline entered in the past does not create a pile of overdue copies. Monthly/quarterly/yearly keep the anchor's day of month,
 using the month's last day when it is shorter (Jan 31 → Feb 28 → Mar 31).
 The new occurrence copies the latest one: title, description, priority, reminder, company, assignees, and
 the checklist (all steps unticked).
*/

export function occurrenceDate(anchor: string, freq: RecurrenceFreq, n: number): string {
  switch (freq) {
    case 'weekly':
      return addDays(anchor, 7 * n)
    case 'monthly':
      return addMonthsClamped(anchor, n)
    case 'quarterly':
      return addMonthsClamped(anchor, 3 * n)
    case 'yearly':
      return addMonthsClamped(anchor, 12 * n)
  }
}

/** Creates the next occurrence for every active series of the org that needs one (or only `seriesId`). Returns new task ids. */
export async function ensureNextOccurrences(org: Pick<Org, 'id' | 'timezone'>, seriesId?: string): Promise<string[]> {
  const today = todayIn(org.timezone)
  return tx(async (c) => {
    const { rows: due } = await c.query(
      `select s.id as series_id, s.frequency, s.anchor_date, t.id as last_id, t.occurrence_no
         from task_series s
         join lateral (
           select * from tasks t where t.series_id = s.id order by t.occurrence_no desc limit 1
         ) t on true
        where s.org_id = $1 and s.active and ($3::uuid is null or s.id = $3)
          and (t.status in ('done', 'cancelled') or t.deadline <= $2)
        for update of s skip locked`,
      [org.id, today, seriesId ?? null],
    )
    const created: string[] = []
    for (const r of due) {
      // Skip periods that are already entirely in the past (e.g. a first deadline entered months ago):
      // the next occurrence is the first one whose deadline is today or later.
      let n = (r.occurrence_no as number) + 1
      while (occurrenceDate(r.anchor_date as string, r.frequency as RecurrenceFreq, n) < today) n++
      const deadline = occurrenceDate(r.anchor_date as string, r.frequency as RecurrenceFreq, n)
      const ins = await c.query(
        `insert into tasks (org_id, company_id, title, description, deadline, priority, status, reminder_days,
                            series_id, occurrence_no, created_by, updated_by)
         select org_id, company_id, title, description, $2, priority, 'not_started', reminder_days, series_id, $3, null, null
           from tasks where id = $1
         on conflict (series_id, occurrence_no) where series_id is not null do nothing
         returning id`,
        [r.last_id, deadline, n],
      )
      if (!ins.rows.length) continue
      const newId = ins.rows[0].id as string
      await c.query(
        `insert into task_assignees (task_id, user_id)
         select $2, a.user_id from task_assignees a join users u on u.id = a.user_id and u.active where a.task_id = $1`,
        [r.last_id, newId],
      )
      await c.query(
        `insert into task_checklist_items (task_id, title, position)
         select $2, title, position from task_checklist_items where task_id = $1`,
        [r.last_id, newId],
      )
      await logActivity({ orgId: org.id, taskId: newId, userId: null, action: 'created_recurring', details: { deadline } }, c)
      created.push(newId)
    }
    return created
  })
}
