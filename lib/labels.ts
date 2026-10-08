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
  assigned: 'أُسندت إليك مهمة',
} as const

export const FREQ_LABEL = {
  weekly: 'أسبوعيًا',
  monthly: 'شهريًا',
  quarterly: 'كل 3 أشهر',
  yearly: 'سنويًا',
} as const

/** Arabic number agreement: 1 → "مهمة واحدة", 2 → "مهمتان", 3–10 → "5 مهام", 11+ → "12 مهمة". */
function counted(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one
  if (n === 2) return two
  if (n >= 3 && n <= 10) return `${n} ${few}`
  return `${n} ${many}`
}
export const tasksCount = (n: number) => counted(n, 'مهمة واحدة', 'مهمتان', 'مهام', 'مهمة')
export const companiesCount = (n: number) => counted(n, 'شركة واحدة', 'شركتان', 'شركات', 'شركة')
