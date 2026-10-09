import 'server-only'
import { redirect } from 'next/navigation'
import { requireSession, type Session } from './auth'
import { one } from './db'
import type { TaskStatus, User } from './types'

/*
 Roles (Phase 3):
  - admin    : everything (all tasks, companies, reports, workload, team).
  - member   : "مسؤول مهام" (Assignee). Sees and edits only the tasks they are assigned to (or created).
               Can add companies and tasks. If a task has followers, "done" becomes "جاهزة للمراجعة".
  - follower : "متابع". Sees only the tasks they follow; approves them (→ منجزة) or returns them
               (→ قيد التنفيذ, with a comment). Can comment. Cannot create or edit tasks or companies.
 Per task: assignees (task_assignees) do the work; followers (task_followers) review it.
*/

export const isAdmin = (u: Pick<User, 'role'>) => u.role === 'admin'
/** Can add/edit companies, tasks, templates and import data. */
export const canManage = (u: Pick<User, 'role'>) => u.role !== 'follower'

/** Session of a user who may add/edit companies, tasks and templates (not followers). */
export async function requireManager(): Promise<Session> {
  const s = await requireSession()
  if (!canManage(s.user)) redirect('/tasks')
  return s
}

/**
 SQL condition: task `t` is visible to the user whose id is in parameter `param`.
 Admins see everything (returns a condition that still uses the parameter, so numbering stays the same).
*/
export function visibleTo(user: Pick<User, 'role'>, param: string) {
  if (isAdmin(user)) return `(${param}::uuid is not null)`
  return `(t.created_by = ${param}
           or exists (select 1 from task_assignees va where va.task_id = t.id and va.user_id = ${param})
           or exists (select 1 from task_followers vf where vf.task_id = t.id and vf.user_id = ${param}))`
}

export type TaskAccess = {
  id: string
  status: TaskStatus
  title: string
  series_id: string | null
  created_by: string | null
  assignee: boolean
  follower: boolean
  has_followers: boolean
  /** Can see the task at all. */
  view: boolean
  /** Can change its fields, status, checklist. */
  edit: boolean
  /** Can approve / return it (a follower of the task, or an admin). */
  review: boolean
  /** Can delete it (admin or its creator). */
  remove: boolean
}

/** Loads a task of the org with what this user may do with it, or null if it does not exist / is not visible. */
export async function taskAccess(taskId: string, s: Session): Promise<TaskAccess | null> {
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return null
  const t = await one<Omit<TaskAccess, 'view' | 'edit' | 'review' | 'remove'>>(
    `select t.id, t.status, t.title, t.series_id, t.created_by,
            exists (select 1 from task_assignees a where a.task_id = t.id and a.user_id = $3) as assignee,
            exists (select 1 from task_followers f where f.task_id = t.id and f.user_id = $3) as follower,
            exists (select 1 from task_followers f where f.task_id = t.id) as has_followers
       from tasks t where t.id = $1 and t.org_id = $2`,
    [taskId, s.org.id, s.user.id],
  )
  if (!t) return null
  const admin = isAdmin(s.user)
  const mine = t.assignee || t.created_by === s.user.id
  const view = admin || mine || t.follower
  if (!view) return null
  return {
    ...t,
    view,
    edit: admin || (canManage(s.user) && mine),
    review: admin || t.follower,
    remove: admin || (canManage(s.user) && t.created_by === s.user.id),
  }
}

/**
 The status that is actually applied when `user` asks for `wanted`:
 on a task with followers, "done" by someone who cannot review becomes "review" (sent for approval).
*/
export function effectiveStatus(a: Pick<TaskAccess, 'has_followers' | 'review'>, wanted: TaskStatus): TaskStatus {
  if (wanted === 'done' && a.has_followers && !a.review) return 'review'
  return wanted
}
