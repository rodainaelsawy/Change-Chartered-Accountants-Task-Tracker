'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setTaskStatus } from '@/app/actions/tasks'
import { isOpen } from '@/lib/labels'
import type { TaskStatus } from '@/lib/types'
import { Spinner } from './submit-button'
import { useToast } from './toast'

/**
 Round "mark done" button in task lists, with immediate feedback and "تراجع" (undo) — H1 + H3.
 On a task with followers, an assignee's click sends it for review; a follower's click on a task
 waiting for review approves it.
*/
export function TaskDoneToggle({
  id,
  title,
  status,
  canEdit,
  canReview,
}: {
  id: string
  title: string
  status: TaskStatus
  canEdit: boolean
  canReview: boolean
}) {
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useState<TaskStatus | null>(null)
  const router = useRouter()
  const toast = useToast()
  const shown = optimistic ?? status
  const inReview = shown === 'review'
  const open = isOpen(shown)

  // What a click does for this user.
  const target: TaskStatus | null = inReview ? (canReview ? 'done' : null) : open ? (canEdit ? 'done' : null) : canEdit ? 'in_progress' : null
  const label = inReview
    ? canReview
      ? `اعتماد «${title}» كمنجزة`
      : 'بانتظار مراجعة المتابع'
    : open
      ? `تحديد «${title}» كمنجزة`
      : `إعادة فتح «${title}»`

  const style =
    shown === 'done'
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : inReview
        ? 'border-amber-400 bg-amber-50 text-amber-600 hover:border-emerald-500 hover:text-emerald-600'
        : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'

  return (
    <button
      type="button"
      disabled={pending || !target}
      title={target ? label : inReview ? 'بانتظار مراجعة المتابع' : 'لا يمكنك تغيير حالة هذه المهمة'}
      aria-label={label}
      onClick={() =>
        target &&
        start(async () => {
          setOptimistic(target)
          const r = await setTaskStatus(id, target)
          if (!r) {
            setOptimistic(null)
            router.refresh()
            return
          }
          setOptimistic(r.applied)
          router.refresh()
          const message =
            r.applied === 'review'
              ? `تم إرسال «${title}» للمراجعة`
              : r.prev === 'review' && r.applied === 'done'
                ? `تم اعتماد «${title}» كمنجزة`
                : r.applied === 'done'
                  ? `تم تحديد «${title}» كمنجزة`
                  : `تمت إعادة فتح «${title}»`
          toast({
            message,
            action: canEdit
              ? {
                  label: 'تراجع',
                  run: async () => {
                    await setTaskStatus(id, r.prev)
                    setOptimistic(null)
                    router.refresh()
                    toast({ message: 'تم التراجع', tone: 'info' })
                  },
                }
              : undefined,
          })
        })
      }
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm disabled:cursor-not-allowed print:hidden ${style} ${
        !target && !inReview && shown !== 'done' ? 'opacity-40' : ''
      }`}
    >
      {pending ? <Spinner className="h-4 w-4 text-emerald-600" /> : inReview ? '⏳' : '✓'}
    </button>
  )
}
