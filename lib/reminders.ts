import 'server-only'
import { query } from './db'
import { addDays, formatDate, relativeDue, todayIn } from './dates'
import { OPEN_SQL, PRIORITY_LABEL } from './labels'
import { appUrl, emailLayout, escapeHtml, sendMail } from './mail'
import { ensureNextOccurrences } from './recurrence'
import type { NotifKind, Org, TaskPriority } from './types'

/*
 Reminder rules (FR-5.x):
  - due_soon : once, when a task is within its reminder window (task.reminder_days ?? org.reminder_days, default 2)
  - due_today: once, on the deadline day
  - overdue  : every day after the deadline until the task is done or cancelled
  - assigned : when someone is added as an assignee (not sent to the person who made the change)
 Reminders go to the task's assignees (active users) — except while the task is «جاهزة للمراجعة», when they go to
 its followers instead (the assignee has finished; the follower must act before the deadline). A task without
 assignees (should not happen, kept as a safety net) notifies every active team member.
 Done / cancelled tasks never produce reminders, and their unread reminders are cleared.
*/

const OPEN = OPEN_SQL

/**
 SQL condition: user `uid` should receive reminders for task `tid` with status `st`
 (followers while it waits for review, otherwise assignees; everyone if it has no active assignee).
*/
const RECIPIENT = (uid: string, tid: string, st: string) => `
  case when ${st} = 'review'
    then exists (select 1 from task_followers f where f.task_id = ${tid} and f.user_id = ${uid})
    else exists (select 1 from task_assignees a where a.task_id = ${tid} and a.user_id = ${uid})
         or not exists (select 1 from task_assignees a join users au on au.id = a.user_id and au.active
                         where a.task_id = ${tid})
  end`

/** Users who should receive a task's reminders. */
const RECIPIENTS = `
  select u.id from users u
   where u.org_id = $1 and u.active and ${RECIPIENT('u.id', 'd.task_id', 'd.status')}`

/** Creates any in-app notifications that are due for open tasks (all, or one task). Idempotent. */
export async function syncNotifications(org: Pick<Org, 'id' | 'timezone' | 'reminder_days'>, taskId?: string) {
  const today = todayIn(org.timezone)
  const params: unknown[] = [org.id, today, org.reminder_days]
  let taskFilter = ''
  if (taskId) {
    params.push(taskId)
    taskFilter = 'and t.id = $4'
  }
  await query(
    `with due as (
       select t.id as task_id, t.status,
              case
                when t.deadline < $2::date then 'overdue'
                when t.deadline = $2::date then 'due_today'
                else 'due_soon'
              end::notif_kind as kind,
              case when t.deadline < $2::date then $2::date else t.deadline end as notify_date
         from tasks t
        where t.org_id = $1 and t.status in ${OPEN} ${taskFilter}
          and t.deadline <= $2::date + coalesce(t.reminder_days, $3)
     )
     insert into notifications (org_id, user_id, task_id, kind, notify_date)
     select $1, r.id, d.task_id, d.kind, d.notify_date
       from due d cross join lateral (${RECIPIENTS}) r
     on conflict do nothing`,
    params,
  )
}

/** "A task was assigned to you" for newly added assignees (except the person who did it). */
export async function notifyAssigned(org: Pick<Org, 'id' | 'timezone'>, taskId: string, userIds: string[], actorId: string) {
  await notifyUsers(org, taskId, userIds, 'assigned', actorId)
}

/**
 One-off notification (assigned / followed / review_*) for some users, except the person who caused it.
 Repeating the same kind on the same day marks it unread again (e.g. a task returned twice in one day).
*/
export async function notifyUsers(
  org: Pick<Org, 'id' | 'timezone'>,
  taskId: string,
  userIds: string[],
  kind: Extract<NotifKind, 'assigned' | 'followed' | 'review_requested' | 'review_returned' | 'review_approved'>,
  actorId: string | null,
) {
  const ids = [...new Set(userIds)].filter((u) => u !== actorId)
  if (!ids.length) return
  await query(
    `insert into notifications (org_id, user_id, task_id, kind, notify_date)
     select $1, u.id, $2, $3::notif_kind, $4 from users u where u.id = any($5::uuid[]) and u.org_id = $1 and u.active
     on conflict (user_id, task_id, kind, notify_date) do update set read_at = null, created_at = now()`,
    [org.id, taskId, kind, todayIn(org.timezone), ids],
  )
}

/** Users of a task by relation (for notifications). */
export async function taskPeople(taskId: string, rel: 'assignees' | 'followers') {
  const table = rel === 'assignees' ? 'task_assignees' : 'task_followers'
  return (await query<{ user_id: string }>(`select user_id from ${table} where task_id = $1`, [taskId])).map((r) => r.user_id)
}

/** After a status change: unread deadline reminders of people who are no longer the recipients are marked read. */
export async function pruneReminders(taskId: string) {
  await query(
    `update notifications n set read_at = now()
       from tasks t
      where t.id = n.task_id and n.task_id = $1 and n.read_at is null and n.kind in ('due_soon', 'due_today', 'overdue')
        and not (${RECIPIENT('n.user_id', 't.id', 't.status')})`,
    [taskId],
  )
}

/** Marks a closed task's unread reminders as read (FR-5.7). */
export async function clearTaskNotifications(taskId: string) {
  await query(
    `update notifications set read_at = now()
      where task_id = $1 and read_at is null and kind in ('due_soon', 'due_today', 'overdue', 'review_requested')`,
    [taskId],
  )
}

/** Creates due recurring occurrences (at most one new one per series per pass). */
export async function runRecurrence(org: Pick<Org, 'id' | 'timezone'>) {
  for (let i = 0; i < 60; i++) {
    const created = await ensureNextOccurrences(org)
    if (!created.length) break
  }
}

/**
 Daily run: creates recurring occurrences and notifications, then sends each user the morning digest email.
 Runs at most once per org per day; returns false if it already ran today.
*/
export async function runDaily(
  org: Org,
  opts: { force?: boolean; deferEmail?: (fn: () => Promise<void>) => void } = {},
): Promise<boolean> {
  const today = todayIn(org.timezone)
  const claimed = await query(
    `update organizations set last_reminder_run = $2
      where id = $1 and ($3 or last_reminder_run is null or last_reminder_run < $2)
      returning id`,
    [org.id, today, opts.force ?? false],
  )
  if (!claimed.length) return false

  await runRecurrence(org)
  await syncNotifications(org)
  if (opts.deferEmail) opts.deferEmail(() => sendDigests(org, today))
  else await sendDigests(org, today)
  return true
}

type DigestTask = {
  id: string
  title: string
  deadline: string
  priority: TaskPriority
  company_name: string
  reminder_days: number | null
}

async function sendDigests(org: Org, today: string) {
  const users = await query<{ id: string; email: string }>(
    'select id, email from users where org_id = $1 and active and email_digest and password_hash is not null',
    [org.id],
  )
  for (const u of users) {
    // Each person gets only the tasks they are responsible for.
    const tasks = await query<DigestTask>(
      `select t.id, t.title, t.deadline, t.priority, t.reminder_days, c.name as company_name
         from tasks t join companies c on c.id = t.company_id
        where t.org_id = $1 and t.status in ${OPEN} and t.deadline <= $2
          and ${RECIPIENT('$3', 't.id', 't.status')}
        order by t.deadline, t.priority desc`,
      [org.id, addDays(today, 7), u.id],
    )
    if (tasks.length) await sendMail(u.email, ...digest(org, today, tasks))
  }
}

function digest(org: Org, today: string, tasks: DigestTask[]): [string, string] {
  const overdue = tasks.filter((t) => t.deadline < today)
  const dueToday = tasks.filter((t) => t.deadline === today)
  const reminder = tasks.filter(
    (t) => t.deadline > today && t.deadline === addDays(today, t.reminder_days ?? org.reminder_days),
  )
  const reminderIds = new Set(reminder.map((t) => t.id))
  const thisWeek = tasks.filter((t) => t.deadline > today && !reminderIds.has(t.id))

  const section = (title: string, color: string, list: DigestTask[]) =>
    list.length
      ? `<h2 style="font-size:15px;margin:20px 0 8px;color:${color}">${title} (${list.length})</h2>
         <table style="width:100%;border-collapse:collapse;font-size:14px">${list
           .map(
             (t) => `<tr style="border-bottom:1px solid #e2e8f0">
               <td style="padding:6px 0"><a href="${appUrl('/tasks/' + t.id)}" style="color:#0f172a">${escapeHtml(t.title)}</a>
                 <div style="color:#64748b;font-size:12px">${escapeHtml(t.company_name)} · ${PRIORITY_LABEL[t.priority]}</div></td>
               <td style="padding:6px 0;text-align:left;white-space:nowrap;color:#475569">${formatDate(t.deadline, 'short')}<br>
                 <span style="font-size:12px">${relativeDue(t.deadline, today)}</span></td></tr>`,
           )
           .join('')}</table>`
      : ''

  const body =
    section('متأخرة', '#b91c1c', overdue) +
    section('موعدها اليوم', '#b45309', dueToday) +
    section('تذكير: اقترب موعدها', '#0369a1', reminder) +
    section('خلال هذا الأسبوع', '#334155', thisWeek) +
    `<p style="margin-top:24px"><a href="${appUrl('/')}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">فتح لوحة المتابعة</a></p>`

  const subject =
    `ملخص مهامك — ${formatDate(today)}` +
    (overdue.length ? ` · ${overdue.length} متأخرة` : '') +
    (dueToday.length ? ` · ${dueToday.length} اليوم` : '')
  return [subject, emailLayout('ملخص مهامك اليومي', body)]
}
