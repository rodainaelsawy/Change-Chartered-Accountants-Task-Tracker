'use client'

import { useRef, useState } from 'react'
import { addComment, deleteComment, editComment } from '@/app/actions/tasks'

export type CommentRow = {
  id: string
  body: string
  author: string | null
  mine: boolean
  canDelete: boolean
  when: string
  edited: boolean
}

/** Comments on a task. Everyone can add; only the author can edit; author or admin can delete. */
export function TaskComments({ taskId, comments }: { taskId: string; comments: CommentRow[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)

  return (
    <div>
      {comments.length === 0 && <p className="mb-3 text-sm text-slate-500">لا توجد تعليقات بعد.</p>}
      <ul className="mb-4 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg bg-slate-50 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{c.author ?? 'مستخدم محذوف'}</span>
              <span>{c.when}</span>
              {c.edited && <span>(معدّل)</span>}
              <span className="ms-auto flex gap-1">
                {c.mine && editing !== c.id && (
                  <button type="button" onClick={() => setEditing(c.id)} className="rounded px-1.5 hover:bg-slate-200">
                    تعديل
                  </button>
                )}
                {c.canDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('حذف هذا التعليق؟')) await deleteComment(c.id)
                    }}
                    className="rounded px-1.5 text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                )}
              </span>
            </div>
            {editing === c.id ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const v = new FormData(e.currentTarget).get('body') as string
                  const r = await editComment(c.id, v)
                  if (r.error) setError(r.error)
                  else setEditing(null)
                }}
              >
                <textarea
                  name="body"
                  defaultValue={c.body}
                  rows={3}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-1 flex gap-2">
                  <button className="rounded-lg bg-brand-700 px-3 py-1 text-xs font-medium text-white">حفظ</button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1 text-xs text-slate-600 hover:bg-slate-200">
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const v = box.current?.value ?? ''
          if (!v.trim()) {
            setError('اكتب التعليق أولًا')
            return
          }
          setBusy(true)
          const r = await addComment(taskId, v)
          setBusy(false)
          if (r.error) setError(r.error)
          else {
            setError('')
            if (box.current) box.current.value = ''
          }
        }}
      >
        <textarea
          ref={box}
          rows={2}
          placeholder="اكتب تعليقًا…"
          onInput={() => setError('')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
        />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
        <button disabled={busy} className="mt-2 rounded-lg bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
          {busy ? 'جارٍ الإرسال…' : 'إضافة تعليق'}
        </button>
      </form>
    </div>
  )
}
