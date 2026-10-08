import 'server-only'
import { query } from './db'
import { addDays, formatDate, relativeDue, todayIn } from './dates'
import { PRIORITY_LABEL } from './labels'
import { appUrl, emailLayout, escapeHtml, sendMail } from './mail'
import type { Org, TaskPriority } from './types'

/*
 Reminder rules (FR-5.x):
  - due_soon : once, when a task is within its reminder window (task.reminder_days ?? org.reminder_days, default 2)
  - due_today: once, on the deadline day
  - overdue  : every day after the deadline until the task is done or cancelled
 In v1 every active team member receives the reminders (no assignment yet).
 Done / cancelled tasks never produce reminders, and their unread reminders are cleared.
*/

const OPEN = `('not_started','in_progress','on_hold')`

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
       select t.id as task_id,
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
     select $1, u.id, d.task_id, d.kind, d.notify_date
       from due d cross join users u
      where u.org_id = $1 and u.active
     on conflict do nothing`,
    params,
  )
}

/** Marks a closed task's unread reminders as read (FR-5.7). */
export async function clearTaskNotifications(taskId: string) {
  await query('update notifications set read_at = now() where task_id = $1 and read_at is null', [taskId])
}

/**
 Daily run: creates notifications and sends each user the morning digest email.
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
  client_name: string
  reminder_days: number | null
}

async function sendDigests(org: Org, today: string) {
  const weekEnd = addDays(today, 7)
  const tasks = await query<DigestTask>(
    `select t.id, t.title, t.deadline, t.priority, t.reminder_days, c.name as client_name
       from tasks t join clients c on c.id = t.client_id
      where t.org_id = $1 and t.status in ${OPEN} and t.deadline <= $2
      order by t.deadline, t.priority desc`,
    [org.id, weekEnd],
  )
  if (!tasks.length) return

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
                 <div style="color:#64748b;font-size:12px">${escapeHtml(t.client_name)} · ${PRIORITY_LABEL[t.priority]}</div></td>
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
    `ملخص المهام — ${formatDate(today)}` +
    (overdue.length ? ` · ${overdue.length} متأخرة` : '') +
    (dueToday.length ? ` · ${dueToday.length} اليوم` : '')

  const users = await query<{ email: string }>(
    'select email from users where org_id = $1 and active and email_digest and password_hash is not null',
    [org.id],
  )
  const html = emailLayout('ملخص المهام اليومي', body)
  for (const u of users) await sendMail(u.email, subject, html)
}
