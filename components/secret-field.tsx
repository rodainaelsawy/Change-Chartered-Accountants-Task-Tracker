'use client'

import { useState, useTransition } from 'react'
import { revealTaxPassword } from '@/app/actions/companies'

/** Shows the tax password hidden; "show" / "copy" fetch the decrypted value from the server only on demand. */
export function TaxPasswordField({ companyId }: { companyId: string }) {
  const [value, setValue] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  async function load() {
    if (value !== null) return value
    const v = (await revealTaxPassword(companyId)) ?? ''
    setValue(v)
    return v
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ltr min-w-24 font-mono text-sm">{shown && value !== null ? value || '—' : '••••••••'}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await load()
            setShown((s) => !s)
          })
        }
        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        {shown ? 'إخفاء' : 'إظهار'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const v = await load()
            try {
              await navigator.clipboard.writeText(v)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              setShown(true)
            }
          })
        }
        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        {copied ? 'تم النسخ ✓' : 'نسخ'}
      </button>
    </div>
  )
}

/** Plain value with a copy button (tax email / username). */
export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ltr break-all text-sm">{value}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {}
        }}
        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        {copied ? 'تم النسخ ✓' : 'نسخ'}
      </button>
    </div>
  )
}
