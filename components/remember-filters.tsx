'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { TASK_FILTERS_COOKIE } from '@/lib/filters-cookie'

function savedFilters() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${TASK_FILTERS_COOKIE}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : ''
}

/**
 Remembers the task-list filters (in a cookie) so they stay applied after leaving and coming back to /tasks.
 The page redirects to the saved filters on a full load; this also covers in-app navigation served from the router cache.
*/
export function RememberFilters({ qs, reset }: { qs: string; reset: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!qs && !reset) {
      const saved = savedFilters()
      if (saved) {
        const msg = new URLSearchParams(window.location.search).get('msg')
        router.replace(`/tasks?${saved}${msg ? `&msg=${encodeURIComponent(msg)}` : ''}`)
        return
      }
    }
    document.cookie = qs
      ? `${TASK_FILTERS_COOKIE}=${encodeURIComponent(qs)}; path=/; max-age=31536000; samesite=lax`
      : `${TASK_FILTERS_COOKIE}=; path=/; max-age=0; samesite=lax`
  }, [qs, reset, router])
  return null
}
