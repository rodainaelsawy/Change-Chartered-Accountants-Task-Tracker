'use client'

import { useOptimistic, useRef, useState, useTransition } from 'react'
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from '@/app/actions/tasks'

export type ChecklistItem = { id: string; title: string; done: boolean; done_by_name: string | null }

/** Steps inside a task: tick, add, delete. Progress bar on top. */
export function TaskChecklist({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, change: { id: string; done?: boolean; remove?: boolean }) =>
    change.remove ? state.filter((i) => i.id !== change.id) : state.map((i) => (i.id === change.id ? { ...i, done: !!change.done } : i)),
  )
  const [, start] = useTransition()
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const done = optimistic.filter((i) => i.done).length
  const pct = optimistic.length ? Math.round((done / optimistic.length) * 100) : 0

  return (
    <div>
      {optimistic.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm tabular-nums text-slate-600">
            {done}/{optimistic.length}
          </span>
        </div>
      )}
      <ul className="space-y-1">
        {optimistic.map((i) => (
          <li key={i.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={i.done}
              aria-label={i.title}
              onChange={(e) => {
                const v = e.target.checked
                start(async () => {
                  setOptimistic({ id: i.id, done: v })
                  await toggleChecklistItem(i.id, v)
                })
              }}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className={`flex-1 text-sm ${i.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{i.title}</span>
            {i.done && i.done_by_name && <span className="text-xs text-slate-400">{i.done_by_name}</span>}
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`حذف الخطوة «${i.title}»؟`)) return
                start(async () => {
                  setOptimistic({ id: i.id, remove: true })
                  await deleteChecklistItem(i.id)
                })
              }}
              className="rounded px-1.5 text-xs text-red-600 opacity-0 hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"
              aria-label="حذف الخطوة"
            >
              حذف
            </button>
          </li>
        ))}
      </ul>
      {!optimistic.length && <p className="mb-2 text-sm text-slate-500">لا توجد خطوات بعد.</p>}
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const v = input.current?.value ?? ''
          if (!v.trim()) {
            setError('اكتب نص الخطوة')
            return
          }
          setAdding(true)
          const r = await addChecklistItem(taskId, v)
          setAdding(false)
          if (r.error) setError(r.error)
          else {
            setError('')
            if (input.current) input.current.value = ''
            input.current?.focus()
          }
        }}
      >
        <input
          ref={input}
          placeholder="أضف خطوة…"
          onInput={() => setError('')}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-600"
        />
        <button disabled={adding} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
          {adding ? '…' : 'إضافة'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}
