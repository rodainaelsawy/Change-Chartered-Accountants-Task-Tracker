import Link from 'next/link'
import { TaskDoneToggle } from './task-done-toggle'
import { formatDate } from '@/lib/dates'
import { isOpen } from '@/lib/labels'
import type { Task, User } from '@/lib/types'
import { DueText, Empty, PriorityText, StatusBadge, urgency, urgencyBorder } from './ui'

/** Task rows with urgency colour, quick "mark done" toggle and links (FR-4.2, FR-6.2, FR-6.3). */
export function TaskList({
  tasks,
  today,
  showCompany = true,
  empty = 'لا توجد مهام',
  viewer,
}: {
  /** The signed-in user: decides what the quick ✓ button may do on each task. */
  viewer: Pick<User, 'id' | 'role'>
  tasks: Task[]
  today: string
  showCompany?: boolean
  empty?: string
}) {
  if (!tasks.length) return <Empty>{empty}</Empty>
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((t) => {
        const open = isOpen(t.status)
        const u = urgency(t.status, t.deadline, today)
        const admin = viewer.role === 'admin'
        const mine = Boolean(t.assignees?.some((a) => a.id === viewer.id)) || t.created_by === viewer.id
        const follows = Boolean(t.followers?.some((f) => f.id === viewer.id))
        return (
          <li key={t.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 ${urgencyBorder[u]}`}>
            <TaskDoneToggle
              id={t.id}
              title={t.title}
              status={t.status}
              canEdit={admin || mine || follows}
              canReview={admin || follows}
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/tasks/${t.id}`}
                className={`block truncate font-medium hover:text-brand-700 ${open ? 'text-slate-900' : 'text-slate-400 line-through'}`}
              >
                {t.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {showCompany && (
                  <Link href={`/companies/${t.company_id}`} className="hover:text-brand-700 hover:underline">
                    {t.company_name}
                  </Link>
                )}
                <PriorityText priority={t.priority} />
                {t.series_id && <span title="مهمة متكررة">↻ متكررة</span>}
                {!!t.checklist_total && (
                  <span className={t.checklist_done === t.checklist_total ? 'text-emerald-700' : ''} title="الخطوات المنجزة">
                    ☑ {t.checklist_done}/{t.checklist_total}
                  </span>
                )}
                {!!t.assignees?.length && (
                  <span className="truncate" title="المسؤولون">
                    👤 {t.assignees.map((a) => a.name.split(' ')[0]).join('، ')}
                  </span>
                )}
                {!!t.followers?.length && (
                  <span className="truncate" title="المتابعون">
                    👁 {t.followers.map((a) => a.name.split(' ')[0]).join('، ')}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-left">
              <div className="text-sm tabular-nums text-slate-700">{formatDate(t.deadline, 'short')}</div>
              <DueText status={t.status} deadline={t.deadline} today={today} />
            </div>
            <div className="hidden w-24 shrink-0 text-left sm:block print:block">
              <StatusBadge status={t.status} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
