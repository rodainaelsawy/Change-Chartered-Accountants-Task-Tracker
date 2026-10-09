import 'server-only'
import { redirect } from 'next/navigation'
import { requireSession, type Session } from './auth'
import { one } from './db'
import type { TaskStatus, User } from './types'

/*
 Roles (users.role):
  - admin  «مدير»: everything (all tasks, companies, reports, workload, team).
  - member «مشرف»: like an admin, but only sees the tasks they are assigned to / follow / created.
                   Full company management (add / edit / delete when no open tasks, files, import).
  - staff  «عضو» : only their tasks (assigned / followed / created); can create and edit them.
                   Companies are read-only (files: view/download only). Otherwise the same as مشرف (templates too).
 ('follower' is a retired role value; such users were moved to 'staff'.)
 Per task, anyone of any role can be an assignee (task_assignees) or a follower (task_followers).
 Followers review: on a task with followers, «منجزة» by a non-follower becomes «جاهزة للمراجعة».
 A task can be deleted by an admin or by its creator.
*/

export const isAdmin = (u: Pick<User, 'role'>) => u.role === 'admin'
/** Can add/edit/delete companies and their files and import companies (admin + مشرف). */
export const canManage = (u: Pick<User, 'role'>) => u.role === 'admin' || u.role === 'member'

/** Session of a user who may manage companies, their files and the import. */
export async function requireManager(): Promise<Session> {
  const s = await requireSession()
  if (!canManage(s.user)) redirect('/companies')
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
  /** Can change its fields, status, checklist (everyone who can see it: admin, assignees, followers, creator). */
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
  const mine = t.assignee || t.follower || t.created_by === s.user.id
  if (!admin && !mine) return null
  return {
    ...t,
    view: true,
    edit: true,
    review: admin || t.follower,
    remove: admin || t.created_by === s.user.id,
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
