'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { approveTask, returnTask } from '@/app/actions/tasks'
import { Spinner, SubmitButton } from './submit-button'
import { useToast } from './toast'
import { btn, inputCls } from './ui'

/** Follower's review of a task that is "جاهزة للمراجعة": approve (→ منجزة) or return with a comment (→ قيد التنفيذ). */
export function ReviewPanel({ taskId }: { taskId: string }) {
  const [returning, setReturning] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  const toast = useToast()

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
      <h2 className="font-semibold text-amber-900">هذه المهمة جاهزة لمراجعتك</h2>
      <p className="mt-1 text-sm text-amber-900/80">راجع العمل ثم اعتمده، أو أعده للمسؤول مع توضيح المطلوب.</p>
      {!returning ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={approveTask.bind(null, taskId)}>
            <SubmitButton className={btn.primary}>✓ اعتماد المهمة كمنجزة</SubmitButton>
          </form>
          <button type="button" onClick={() => setReturning(true)} className={btn.secondary}>
            ↩ إعادة للتعديل
          </button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!comment.trim()) {
              setError('اكتب سبب الإعادة أو المطلوب تعديله')
              return
            }
            start(async () => {
              const r = await returnTask(taskId, comment)
              if (r.error) setError(r.error)
              else {
                toast({ message: 'أُعيدت المهمة للمسؤول مع تعليقك' })
                router.refresh()
              }
            })
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            المطلوب تعديله <span className="text-red-600">*</span>
            <textarea
              autoFocus
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
              className={`${inputCls} mt-1`}
              placeholder="مثال: رقم الإقرار غير مطابق، برجاء المراجعة"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button disabled={pending} className={btn.primary}>
              {pending && <Spinner />} إعادة المهمة
            </button>
            <button type="button" onClick={() => setReturning(false)} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white">
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
