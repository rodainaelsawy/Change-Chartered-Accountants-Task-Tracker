'use client'

import { useState } from 'react'
import { RequiredMark } from './ui'

/** Mandatory multi-select of companies with a search box and "select all shown". */
export function CompanyPicker({ companies }: { companies: { id: string; name: string }[] }) {
  const [q, setQ] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const shown = companies.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (id: string, on: boolean) =>
    setChecked((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })
  return (
    <fieldset data-group="companies" className="rounded-lg border border-slate-300 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">
        الشركات
        <RequiredMark />
        <span className="ms-2 text-xs font-normal text-slate-500">({checked.size} محددة)</span>
      </legend>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => setChecked((s) => new Set([...s, ...shown.map((c) => c.id)]))}
          className="rounded-lg px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
        >
          تحديد الظاهر
        </button>
        <button type="button" onClick={() => setChecked(new Set())} className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
          إلغاء التحديد
        </button>
      </div>
      <div className="grid max-h-60 gap-1 overflow-y-auto sm:grid-cols-2">
        {companies.map((c) => (
          <label key={c.id} className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50 ${shown.includes(c) ? '' : 'hidden'}`}>
            <input
              type="checkbox"
              name="companies"
              value={c.id}
              checked={checked.has(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
              className="h-4 w-4"
            />
            {c.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
