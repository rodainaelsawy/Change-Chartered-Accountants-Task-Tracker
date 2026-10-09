'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { FLASH } from '@/lib/flash'

/*
 Toasts (Nielsen H1 visibility of system status, H3 user control & freedom):
 short confirmations at the bottom of the screen, optionally with an "تراجع" (undo) action.
 Server actions that redirect add ?msg=<key>; <FlashFromUrl> turns it into a toast and removes it from the URL.
*/

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info'; action?: { label: string; run: () => void | Promise<void> } }
type ShowToast = (t: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }) => void

const Ctx = createContext<ShowToast>(() => {})
export const useToast = () => useContext(Ctx)

let seq = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const show = useCallback<ShowToast>(
    (t) => {
      const id = ++seq
      setToasts((ts) => [...ts.slice(-2), { id, tone: 'success', ...t }])
      timers.current.set(id, setTimeout(() => dismiss(id), t.action ? 7000 : 4000))
    },
    [dismiss],
  )

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-xl items-center gap-4 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
              t.tone === 'error' ? 'bg-red-700' : t.tone === 'info' ? 'bg-slate-800' : 'bg-slate-900'
            }`}
          >
            <span>
              {t.tone === 'success' && <span className="me-1.5 text-emerald-400">✓</span>}
              {t.message}
            </span>
            {t.action && (
              <button
                type="button"
                className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
                onClick={async () => {
                  dismiss(t.id)
                  await t.action!.run()
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="إغلاق" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

const ERROR_KEYS = ['company_has_open_tasks']

/** Shows the toast for ?msg=<key> (set by server actions before redirecting) and cleans the URL. */
export function FlashFromUrl() {
  const params = useSearchParams()
  const router = useRouter()
  const path = usePathname()
  const show = useToast()
  const key = params.get('msg')
  useEffect(() => {
    if (!key) return
    const message = FLASH[key as keyof typeof FLASH]
    if (message) show({ message, tone: ERROR_KEYS.includes(key) ? 'error' : 'success' })
    const rest = new URLSearchParams(params)
    rest.delete('msg')
    router.replace(rest.size ? `${path}?${rest}` : path, { scroll: false })
  }, [key, params, path, router, show])
  return null
}
