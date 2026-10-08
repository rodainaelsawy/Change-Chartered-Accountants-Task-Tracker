'use client'

import { useState } from 'react'

/** Simple tabs. Panels are rendered on the server and passed in; only the visible one is shown. */
export function Tabs({
  tabs,
  initial,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[]
  initial?: string
}) {
  const [active, setActive] = useState(initial && tabs.some((t) => t.id === initial) ? initial : tabs[0].id)
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-slate-200 px-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${
              active === t.id ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id} className="p-5">
          {t.content}
        </div>
      ))}
    </div>
  )
}
