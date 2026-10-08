'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'


export function KeyboardShortcuts() {
  const router = useRouter()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      const k = e.key.toLowerCase()
      // Arabic keyboard layout: the same physical keys produce Arabic letters, so match e.code too.
      const code = e.code
      if (k === '?' || (e.shiftKey && code === 'Slash')) router.push('/help')
      else if (k === '/' || code === 'Slash') {
        const box = document.getElementById('global-search') as HTMLInputElement | null
        e.preventDefault()
        if (box && box.offsetParent) box.focus()
        else router.push('/search')
      } else if (code === 'KeyN') router.push('/tasks/new')
      else if (code === 'KeyT') router.push('/tasks')
      else if (code === 'KeyM') router.push('/tasks?assignee=me')
      else if (code === 'KeyC') router.push('/calendar')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])
  return null
}
