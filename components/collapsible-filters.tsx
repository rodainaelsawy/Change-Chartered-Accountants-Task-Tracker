'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

/** On phones the filters fold behind a «فلاتر» button so the list comes first; on large screens they are always shown. */
export function CollapsibleFilters({ active, children }: { active: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4 print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {open ? 'إخفاء الفلاتر' : 'الفلاتر والترتيب'}
        {active > 0 && <span className="rounded-full bg-brand-700 px-2 text-xs leading-5 text-white">{active}</span>}
      </button>
      <div className={`${open ? 'mt-3' : 'hidden'} lg:mt-0 lg:block`}>{children}</div>
    </div>
  )
}
