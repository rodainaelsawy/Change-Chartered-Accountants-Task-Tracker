'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Light / dark switch. The choice is saved in this browser; the first visit follows the device setting. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), [])
  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark
        setDark(next)
        if (next) document.documentElement.dataset.theme = 'dark'
        else delete document.documentElement.dataset.theme
        try {
          localStorage.setItem('theme', next ? 'dark' : 'light')
        } catch {}
      }}
      aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      className={className}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
