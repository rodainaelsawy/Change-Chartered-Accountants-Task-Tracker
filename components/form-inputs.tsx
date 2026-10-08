'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { inputCls } from './ui'

/** Date input that warns when the chosen deadline is already in the past (H5 error prevention). */
export function DeadlineInput({
  name,
  defaultValue,
  today,
  required,
  className = inputCls,
}: {
  name: string
  defaultValue?: string
  today: string
  required?: boolean
  className?: string
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const past = Boolean(value) && value < today
  return (
    <>
      <input name={name} type="date" required={required} value={value} onChange={(e) => setValue(e.target.value)} className={className} />
      {past && <span className="mt-1 block text-xs text-amber-700">⚠ هذا التاريخ في الماضي، ستظهر المهمة كمتأخرة.</span>}
    </>
  )
}

/**
 Searchable company picker (H6 recognition rather than recall, H7 efficiency): type part of a name and pick
 from the matches instead of scrolling a long list. Submits the company id in a hidden input.
*/
export function CompanyCombobox({
  name,
  companies,
  defaultValue,
  required,
}: {
  name: string
  companies: { id: string; name: string }[]
  defaultValue?: string
  required?: boolean
}) {
  const initial = companies.find((c) => c.id === defaultValue)
  const [selected, setSelected] = useState(initial ?? null)
  const [text, setText] = useState(initial?.name ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    const list = !q || selected?.name === text ? companies : companies.filter((c) => c.name.toLowerCase().includes(q))
    return list.slice(0, 50)
  }, [text, companies, selected])

  // The visible input carries the validation message; the hidden one carries the id.
  useEffect(() => {
    input.current?.setCustomValidity(text && !selected ? 'اختر شركة من القائمة' : '')
  }, [text, selected])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (c: { id: string; name: string }) => {
    setSelected(c)
    setText(c.name)
    setOpen(false)
    // let the form clear this field's error
    setTimeout(() => input.current?.dispatchEvent(new Event('input', { bubbles: true })), 0)
  }

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      <input
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        required={required}
        value={text}
        placeholder="اكتب جزءًا من اسم الشركة…"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value)
          setSelected(null)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, matches.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && matches[active]) {
            e.preventDefault()
            pick(matches[active])
          } else if (e.key === 'Escape') setOpen(false)
        }}
        className={inputCls}
      />
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">لا توجد شركة بهذا الاسم</li>}
          {matches.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={selected?.id === c.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-brand-50 text-brand-800' : ''} ${selected?.id === c.id ? 'font-semibold' : ''}`}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
