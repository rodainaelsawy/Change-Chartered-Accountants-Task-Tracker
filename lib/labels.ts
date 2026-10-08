import type { TaskPriority, TaskStatus } from './types'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'لم تبدأ',
  in_progress: 'قيد التنفيذ',
  on_hold: 'معلّقة',
  done: 'منجزة',
  cancelled: 'ملغاة',
}

export const STATUS_STYLE: Record<TaskStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-sky-100 text-sky-800',
  on_hold: 'bg-violet-100 text-violet-800',
  done: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'text-slate-500',
  medium: 'text-slate-700',
  high: 'text-amber-700 font-medium',
  urgent: 'text-red-700 font-semibold',
}

export const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[]
export const PRIORITIES = Object.keys(PRIORITY_LABEL) as TaskPriority[]
export const OPEN_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'on_hold']

export function isOpen(status: TaskStatus) {
  return OPEN_STATUSES.includes(status)
}

export const NOTIF_LABEL = {
  due_soon: 'اقترب موعد التسليم',
  due_today: 'موعد التسليم اليوم',
  overdue: 'تجاوزت موعد التسليم',
} as const
