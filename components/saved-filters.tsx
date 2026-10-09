'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deleteFilter, saveFilter } from '@/app/actions/filters'
import { useToast } from './toast'

/** Chips of the user's saved task filters + "حفظ الفلتر الحالي" (Phase 3: saved filters). */
export function SavedFilters({ items, current }: { items: { id: string; name: string; query: string }[]; current: string }) {
  const [naming, setNaming] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const toast = useToast()
  const norm = (q: string) => new URLSearchParams([...new URLSearchParams(q)].filter(([k]) => k !== 'view').sort()).toString()
  const active = norm(current)

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-sm text-slate-500">الفلاتر المحفوظة:</span>
      {items.length === 0 && !naming && <span className="text-sm text-slate-400">لا يوجد بعد</span>}
      {items.map((f) => (
        <span
          key={f.id}
          className={`inline-flex items-center rounded-full border text-sm ${
            norm(f.query) === active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          <Link href={`/tasks?${f.query}`} className="py-1 ps-3 pe-1 hover:underline">
            {f.name}
          </Link>
          <button
            type="button"
            aria-label={`حذف الفلتر «${f.name}»`}
            title="حذف"
            onClick={() =>
              window.confirm(`حذف الفلتر المحفوظ «${f.name}»؟`) &&
              start(async () => {
                await deleteFilter(f.id)
                router.refresh()
                toast({ message: `تم حذف الفلتر «${f.name}»`, tone: 'info' })
              })
            }
            className="rounded-full px-2 py-1 text-slate-400 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
      {naming ? (
        <form
          className="inline-flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await saveFilter(input.current?.value ?? '', current)
              if (r.error) setError(r.error)
              else {
                setNaming(false)
                setError('')
                router.refresh()
                toast({ message: 'تم حفظ الفلتر' })
              }
            })
          }}
        >
          <input
            ref={input}
            autoFocus
            placeholder="اسم الفلتر، مثال: متأخرات منى"
            onInput={() => setError('')}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
          <button disabled={pending} className="rounded-lg bg-brand-700 px-3 py-1 text-sm text-white hover:bg-brand-800">
            حفظ
          </button>
          <button type="button" onClick={() => setNaming(false)} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            إلغاء
          </button>
          {error && <span className="text-sm text-red-700">{error}</span>}
        </form>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100">
          + حفظ الفلتر الحالي
        </button>
      )}
    </div>
  )
}
