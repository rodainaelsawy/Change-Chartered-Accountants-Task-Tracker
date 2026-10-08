export type TaskStatus = 'not_started' | 'in_progress' | 'on_hold' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type UserRole = 'admin' | 'member'
export type NotifKind = 'due_soon' | 'due_today' | 'overdue'

export interface Org {
  id: string
  name: string
  timezone: string
  reminder_days: number
  last_reminder_run: string | null
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string
  role: UserRole
  email_digest: boolean
  active: boolean
}

export interface Client {
  id: string
  name: string
  company: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  notes: string | null
  archived_at: Date | null
  created_at: Date
}

export interface Task {
  id: string
  client_id: string
  client_name: string
  title: string
  description: string | null
  deadline: string
  priority: TaskPriority
  status: TaskStatus
  reminder_days: number | null
  created_at: Date
  updated_at: Date
  completed_at: Date | null
  created_by_name?: string | null
  updated_by_name?: string | null
}
