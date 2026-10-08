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

export interface Company {
  id: string
  name: string
  activity: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  notes: string | null
  tax_email: string | null
  tax_username: string | null
  tax_password_enc: string | null
  archived_at: Date | null
  created_at: Date
}

export type AttachmentKind = 'commercial_register' | 'tax_card' | 'other'

export interface Attachment {
  id: string
  kind: AttachmentKind
  file_name: string
  size_bytes: number
  created_at: Date
  uploaded_by_name: string | null
}

export interface Task {
  id: string
  company_id: string
  company_name: string
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
