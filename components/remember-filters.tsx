'use client'

import { useEffect } from 'react'

/**
 Saves a list page's filters (cookie per page) so they stay applied after leaving the page and coming back.
 When the page was opened without filters in the URL and the saved ones were used, they are also put back in the URL.
*/
export function RememberFilters({ page, qs, reset }: { page: string; qs: string; reset: boolean }) {
  useEffect(() => {
    const name = `filters_${page}`
    document.cookie = qs
      ? `${name}=${encodeURIComponent(qs)}; path=/; max-age=31536000; samesite=lax`
      : `${name}=; path=/; max-age=0; samesite=lax`
    if (!qs || reset) return
    // After the router has written its own URL for this navigation.
    const t = setTimeout(() => {
      const url = new URLSearchParams(window.location.search)
      const saved = new URLSearchParams(qs)
      if ([...saved.keys()].some((k) => url.has(k))) return
      saved.forEach((v, k) => url.set(k, v))
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${url}`)
    }, 50)
    return () => clearTimeout(t)
  }, [page, qs, reset])
  return null
}
