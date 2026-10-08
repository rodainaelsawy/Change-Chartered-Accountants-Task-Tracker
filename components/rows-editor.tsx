'use client'

import { useState } from 'react'
import { FREQ_LABEL, PRIORITIES, PRIORITY_LABEL } from '@/lib/labels'
import { RequiredMark, inputCls } from './ui'

const small = `${inputCls} py-1.5`

let seq = 0
const nextKey = () => `r${++seq}`

export type TemplateItem = {
  title: string
  offset_days: number
  priority: string
  recurrence: string | null
  checklist: string
}

/** Editable list of template items. Inputs are plain named fields (item_*) read in order by the server action. */
export function TemplateItemsEditor({ initial }: { initial: TemplateItem[] }) {
  const [rows, setRows] = useState(() =>
    (initial.length ? initial : [{ title: '', offset_days: 0, priority: 'medium', recurrence: null, checklist: '' }]).map((r) => ({
      key: nextKey(),
      ...r,
    })),
  )
  const move = (i: number, d: number) =>
    setRows((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const copy = [...rs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">مهمة {i + 1}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 text-slate-500 hover:bg-slate-200 disabled:opacity-30" aria-label="لأعلى">
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded px-2 text-slate-500 hover:bg-slate-200 disabled:opacity-30" aria-label="لأسفل">
                ↓
              </button>
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="rounded px-2 text-red-600 hover:bg-red-50">
                  حذف
                </button>
              )}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block sm:col-span-4">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                عنوان المهمة
                <RequiredMark />
              </span>
              <input name="item_title" required defaultValue={r.title} className={small} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">الموعد بعد (أيام)</span>
              <input name="item_offset" type="number" min={0} max={3650} defaultValue={r.offset_days} className={small} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">الأولوية</span>
              <select name="item_priority" defaultValue={r.priority} className={small}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">التكرار</span>
              <select name="item_recurrence" defaultValue={r.recurrence ?? ''} className={small}>
                <option value="">بدون تكرار</option>
                {Object.entries(FREQ_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-4">
              <span className="mb-1 block text-xs font-medium text-slate-600">الخطوات (سطر لكل خطوة، اختياري)</span>
              <textarea name="item_checklist" rows={2} defaultValue={r.checklist} className={small} />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, { key: nextKey(), title: '', offset_days: 0, priority: 'medium', recurrence: null, checklist: '' }])}
        className="w-full rounded-xl border-2 border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-brand-600 hover:text-brand-700"
      >
        + إضافة مهمة للقالب
      </button>
    </div>
  )
}

/** Rows of title / deadline / priority for bulk-adding tasks to one company. */
export function BulkRowsEditor({ defaultDeadline }: { defaultDeadline: string }) {
  const [rows, setRows] = useState(() => [nextKey(), nextKey(), nextKey()])
  return (
    <div>
      <div className="hidden grid-cols-[1fr_11rem_8rem_2.5rem] gap-2 px-1 pb-1 text-xs font-medium text-slate-600 sm:grid">
        <span>
          عنوان المهمة
          <RequiredMark />
        </span>
        <span>
          موعد التسليم
          <RequiredMark />
        </span>
        <span>الأولوية</span>
        <span />
      </div>
      <div className="space-y-2">
        {rows.map((key, i) => (
          <div key={key} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_11rem_8rem_2.5rem] sm:border-0 sm:p-0">
            <label className="col-span-2 block sm:col-span-1">
              <span className="sr-only">عنوان المهمة {i + 1}</span>
              <input name="row_title" required={i === 0} placeholder={`مهمة ${i + 1}`} className={small} />
            </label>
            <label className="block">
              <span className="sr-only">موعد التسليم</span>
              <input name="row_deadline" type="date" required defaultValue={defaultDeadline} className={small} />
            </label>
            <label className="block">
              <span className="sr-only">الأولوية</span>
              <select name="row_priority" defaultValue="medium" className={small}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={rows.length === 1}
              onClick={() => setRows((rs) => rs.filter((k) => k !== key))}
              className="rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30"
              aria-label="حذف الصف"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">الصفوف التي ليس لها عنوان يتم تجاهلها.</p>
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, nextKey()])}
        className="mt-2 w-full rounded-xl border-2 border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-brand-600 hover:text-brand-700"
      >
        + صف جديد
      </button>
    </div>
  )
}
