'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setTaskStatus } from '@/app/actions/tasks'
import { formatDate } from '@/lib/dates'
import { STATUS_LABEL, tasksCount } from '@/lib/labels'
import type { Task, TaskStatus, User } from '@/lib/types'
import { useToast } from './toast'
import { DueText, PriorityText } from './ui'

const COLUMNS: { status: TaskStatus; tone: string }[] = [
  { status: 'not_started', tone: 'border-t-slate-400' },
  { status: 'in_progress', tone: 'border-t-sky-500' },
  { status: 'on_hold', tone: 'border-t-violet-500' },
  { status: 'review', tone: 'border-t-amber-500' },
  { status: 'done', tone: 'border-t-emerald-500' },
]

/**
 Kanban board (Phase 3): one column per status. Drag a card to another column (or use the
 "نقل إلى" menu on the card, which also works on phones and with the keyboard) to change its status.
 Permissions are the same as everywhere else: assignees move their own tasks; on a task with followers,
 "منجزة" becomes "جاهزة للمراجعة" unless the user can review it.
*/
export function TaskBoard({ tasks, today, viewer }: { tasks: Task[]; today: string; viewer: Pick<User, 'id' | 'role'> }) {
  const [moved, setMoved] = useState<Record<string, TaskStatus>>({})
  const [over, setOver] = useState<TaskStatus | null>(null)
  const [, start] = useTransition()
  const router = useRouter()
  const toast = useToast()

  const statusOf = (t: Task) => moved[t.id] ?? t.status
  const perms = (t: Task) => {
    const admin = viewer.role === 'admin'
    const mine = Boolean(t.assignees?.some((a) => a.id === viewer.id)) || t.created_by === viewer.id
    const follows = Boolean(t.followers?.some((f) => f.id === viewer.id))
    return { edit: admin || (viewer.role !== 'follower' && mine), review: admin || follows }
  }
  const canMove = (t: Task, to: TaskStatus) => {
    const p = perms(t)
    if (statusOf(t) === to) return false
    if (p.edit) return true
    return p.review && statusOf(t) === 'review' && to === 'done'
  }

  function move(t: Task, to: TaskStatus) {
    if (!canMove(t, to)) {
      toast({ message: 'لا يمكنك نقل هذه المهمة إلى هذا العمود', tone: 'error' })
      return
    }
    const from = statusOf(t)
    setMoved((m) => ({ ...m, [t.id]: to }))
    start(async () => {
      const r = await setTaskStatus(t.id, to)
      if (!r) {
        setMoved((m) => ({ ...m, [t.id]: from }))
        toast({ message: 'تعذّر تغيير الحالة', tone: 'error' })
        return
      }
      setMoved((m) => ({ ...m, [t.id]: r.applied }))
      router.refresh()
      toast({
        message:
          r.applied !== to
            ? `«${t.title}» لها متابع، فأصبحت «${STATUS_LABEL[r.applied]}» بانتظار اعتماده`
            : `«${t.title}» ← ${STATUS_LABEL[r.applied]}`,
        action: perms(t).edit
          ? {
              label: 'تراجع',
              run: async () => {
                await setTaskStatus(t.id, r.prev)
                setMoved((m) => ({ ...m, [t.id]: r.prev }))
                router.refresh()
              },
            }
          : undefined,
      })
    })
  }

  const cancelled = tasks.filter((t) => statusOf(t) === 'cancelled').length

  return (
    <div>
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const list = tasks.filter((t) => statusOf(t) === col.status)
          return (
            <section
              key={col.status}
              aria-label={STATUS_LABEL[col.status]}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(col.status)
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                const t = tasks.find((x) => x.id === e.dataTransfer.getData('text/plain'))
                if (t) move(t, col.status)
              }}
              className={`flex min-h-48 flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-50 ${col.tone} ${
                over === col.status ? 'ring-2 ring-brand-400' : ''
              }`}
            >
              <h2 className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700">
                {STATUS_LABEL[col.status]}
                <span className="rounded-full bg-white px-2 text-xs tabular-nums text-slate-500">{list.length}</span>
              </h2>
              <ul className="flex-1 space-y-2 px-2 pb-2">
                {list.map((t) => {
                  const p = perms(t)
                  const draggable = p.edit || (p.review && statusOf(t) === 'review')
                  return (
                    <li
                      key={t.id}
                      draggable={draggable}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                      className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <Link href={`/tasks/${t.id}`} className="block font-medium text-slate-900 hover:text-brand-700">
                        {t.title}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">{t.company_name}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="tabular-nums text-slate-600">{formatDate(t.deadline, 'short')}</span>
                        <DueText status={statusOf(t)} deadline={t.deadline} today={today} />
                        <PriorityText priority={t.priority} />
                      </div>
                      {!!t.assignees?.length && (
                        <div className="mt-1 truncate text-xs text-slate-500">👤 {t.assignees.map((a) => a.name.split(' ')[0]).join('، ')}</div>
                      )}
                      {draggable && (
                        <select
                          aria-label={`نقل «${t.title}» إلى`}
                          value=""
                          onChange={(e) => e.target.value && move(t, e.target.value as TaskStatus)}
                          className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                        >
                          <option value="">نقل إلى…</option>
                          {COLUMNS.filter((c) => canMove(t, c.status)).map((c) => (
                            <option key={c.status} value={c.status}>
                              {STATUS_LABEL[c.status]}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  )
                })}
                {!list.length && <li className="py-6 text-center text-xs text-slate-400">اسحب مهمة إلى هنا</li>}
              </ul>
            </section>
          )
        })}
      </div>
      {cancelled > 0 && <p className="mt-2 text-xs text-slate-500">{tasksCount(cancelled)} ملغاة لا تظهر في اللوحة.</p>}
    </div>
  )
}
