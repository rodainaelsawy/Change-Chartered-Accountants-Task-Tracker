'use client'

import { useFormStatus } from 'react-dom'

/** Submit button that disables itself and shows a spinner while its form's server action runs (H1). */
export function SubmitButton({
  children,
  className,
  pendingLabel,
  title,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  title?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-busy={pending} title={title} className={`${className ?? ''} disabled:cursor-wait disabled:opacity-60`}>
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
