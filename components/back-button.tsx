'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

let movedInApp = false

/** Rendered once in the layout: notes that the user has navigated inside the app (so "رجوع" can go back). */
export function NavTracker() {
  const pathname = usePathname()
  const first = useRef(pathname)
  useEffect(() => {
    if (pathname !== first.current) movedInApp = true
  }, [pathname])
  return null
}

/** "رجوع": returns to the page the user came from (with its filters); falls back to `fallback` when opened directly. */
export function BackButton({ fallback = '/', className }: { fallback?: string; className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (movedInApp ? router.back() : router.push(fallback))}
      className={className ?? 'mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 print:hidden'}
    >
      <span aria-hidden="true">→</span> رجوع
    </button>
  )
}
