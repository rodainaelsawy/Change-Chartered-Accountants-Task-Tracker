'use client'

import { startTransition, useActionState, useEffect, useRef } from 'react'
import { Alert, btn } from './ui'

type State = { error?: string; ok?: string } | undefined

/** A form bound to a server action that returns { error } / { ok }. Shows the message and a pending state. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-4',
  submitClassName = btn.primary,
  resetOnSuccess = false,
  footer,
}: {
  action: (state: State, fd: FormData) => Promise<State>
  children: React.ReactNode
  submitLabel: string
  className?: string
  submitClassName?: string
  resetOnSuccess?: boolean
  footer?: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form
      ref={ref}
      className={className}
      // Submit manually so React does not clear the inputs when the action returns an error.
      onSubmit={(e) => {
        e.preventDefault()
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
        const fd = new FormData(e.currentTarget, submitter)
        startTransition(() => formAction(fd))
      }}
    >
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert kind="success">{state.ok}</Alert>}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={submitClassName}>
          {pending ? 'جارٍ الحفظ…' : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  )
}

/** A small button that runs a server action, optionally after a confirmation prompt. */
export function ConfirmButton({
  action,
  confirmText,
  className,
  children,
}: {
  action: () => Promise<void>
  confirmText?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault()
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
