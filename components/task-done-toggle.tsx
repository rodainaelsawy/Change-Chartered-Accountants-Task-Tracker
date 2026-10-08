'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setTaskStatus } from '@/app/actions/tasks'
import type { TaskStatus } from '@/lib/types'
import { Spinner } from './submit-button'
import { useToast } from './toast'

/** Round "mark done" button in task lists, with immediate feedback and "تراجع" (undo) — H1 + H3. */
export function TaskDoneToggle({ id, title, status }: { id: string; title: string; status: TaskStatus }) {
  const open = ['not_started', 'in_progress', 'on_hold'].includes(status)
  const [pending, start] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null)
  const router = useRouter()
  const toast = useToast()
  const done = optimisticDone ?? status === 'done'

  return (
    <button
      type="button"
      disabled={pending}
      title={open ? 'تحديد كمنجزة' : 'إعادة فتح'}
      aria-label={open ? `تحديد «${title}» كمنجزة` : `إعادة فتح «${title}»`}
      onClick={() =>
        start(async () => {
          setOptimisticDone(open)
          const prev = await setTaskStatus(id, open ? 'done' : 'in_progress')
          router.refresh()
          if (!prev) return
          toast({
            message: open ? `تم تحديد «${title}» كمنجزة` : `تمت إعادة فتح «${title}»`,
            action: {
              label: 'تراجع',
              run: async () => {
                await setTaskStatus(id, prev)
                setOptimisticDone(null)
                router.refresh()
                toast({ message: 'تم التراجع', tone: 'info' })
              },
            },
          })
        })
      }
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm print:hidden ${
        done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'
      }`}
    >
      {pending ? <Spinner className="h-4 w-4 text-emerald-600" /> : '✓'}
    </button>
  )
}
