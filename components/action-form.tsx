'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Spinner, SubmitButton } from './submit-button'
import { Alert, RequiredMark, btn } from './ui'

type State = { error?: string; ok?: string } | undefined
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/** Arabic message for a control that fails the browser's built-in checks (required, email, minLength, min/max). */
function arabicMessage(el: Control): string | null {
  const v = el.validity
  if (v.valid) return null
  if (v.customError) return el.validationMessage
  if (v.valueMissing) return el instanceof HTMLSelectElement ? 'يرجى الاختيار من القائمة' : 'هذا الحقل إلزامي'
  if (v.typeMismatch && el.type === 'email') return 'البريد الإلكتروني غير صحيح'
  if (v.tooShort && 'minLength' in el) return `يجب ألا يقل عن ${el.minLength} أحرف`
  if (v.rangeUnderflow || v.rangeOverflow) {
    const i = el as HTMLInputElement
    return `القيمة يجب أن تكون بين ${i.min} و ${i.max}`
  }
  if (v.badInput || v.stepMismatch) return 'القيمة غير صحيحة'
  return 'القيمة غير صحيحة'
}

function setError(el: Control, message: string | null) {
  const label = el.closest('label')
  if (message) {
    el.setAttribute('aria-invalid', 'true')
    label?.setAttribute('data-error', message)
  } else {
    el.removeAttribute('aria-invalid')
    label?.removeAttribute('data-error')
  }
}

/**
 A form bound to a server action that returns { error } / { ok }.
  - Mandatory fields (the `required` attribute) get a red * through <Field>; the form shows a note explaining it.
  - Validation runs before submit and shows Arabic messages under each field (instead of the browser's own popups).
  - `oneOf`: groups of field names where at least one must be filled (e.g. [['phone', 'email']]).
*/
export function ActionForm({
  action,
  children,
  submitLabel,
  className = 'space-y-4',
  submitClassName = btn.primary,
  resetOnSuccess = false,
  footer,
  oneOf = [],
  checkGroups = [],
  showRequiredNote = true,
  cancelHref,
  warnUnsaved = true,
  id,
  actionsTarget,
}: {
  action: (state: State, fd: FormData) => Promise<State>
  children: React.ReactNode
  submitLabel: string
  className?: string
  submitClassName?: string
  resetOnSuccess?: boolean
  footer?: React.ReactNode
  oneOf?: { fields: string[]; message: string }[]
  /** Checkbox groups (by name) where at least one box must be ticked; the container has data-group="name". */
  checkGroups?: { name: string; message: string }[]
  showRequiredNote?: boolean
  /** Shows an "إلغاء" link back to this page (H3 user control & freedom). */
  cancelHref?: string
  /** Ask before leaving the page with unsaved changes (H5 error prevention). */
  warnUnsaved?: boolean
  id?: string
  /** Id of an element elsewhere on the page (e.g. the page header) to show the save/cancel buttons in, instead of under the form. Needs `id`. */
  actionsTarget?: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [summary, setSummary] = useState('')
  const ref = useRef<HTMLFormElement>(null)
  const [dirty, setDirty] = useState(false)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (actionsTarget) setTarget(document.getElementById(actionsTarget))
  }, [actionsTarget])
  useEffect(() => {
    if (state?.ok) setDirty(false)
    if (state?.error) setDirty(true) // nothing was saved
    if (resetOnSuccess && state?.ok) ref.current?.reset()
  }, [state, resetOnSuccess])

  // Unsaved changes: warn on tab close/reload and on in-app link clicks.
  useEffect(() => {
    if (!dirty || !warnUnsaved) return
    const message = 'لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟'
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || e.defaultPrevented) return
      if (ref.current?.contains(a) && !a.dataset.cancel) return
      if (!window.confirm(message)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, warnUnsaved])

  function validate(form: HTMLFormElement): boolean {
    const controls = Array.from(form.elements).filter(
      (e): e is Control =>
        (e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement) &&
        e.type !== 'hidden' &&
        !e.disabled,
    )
    let first: Control | null = null
    for (const el of controls) {
      const msg = arabicMessage(el)
      setError(el, msg)
      if (msg && !first) first = el
    }
    for (const group of oneOf) {
      const els = group.fields
        .map((n) => form.elements.namedItem(n))
        .filter((e): e is Control => e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement)
      if (els.length && els.every((e) => !e.value.trim())) {
        els.forEach((e) => setError(e, group.message))
        first ??= els[0]
      }
    }
    let groupFailed = false
    for (const g of checkGroups) {
      const box = form.querySelector<HTMLElement>(`[data-group="${g.name}"]`)
      const ticked = form.querySelectorAll(`input[type=checkbox][name="${g.name}"]:checked`).length > 0
      if (ticked) box?.removeAttribute('data-error')
      else {
        box?.setAttribute('data-error', g.message)
        groupFailed = true
        first ??= form.querySelector<HTMLInputElement>(`input[type=checkbox][name="${g.name}"]`)
      }
    }
    if (first || groupFailed) {
      first?.focus()
      setSummary('يرجى استكمال الحقول المطلوبة الموضحة باللون الأحمر.')
      return false
    }
    setSummary('')
    return true
  }

  const buttons = (
    <>
      <button type="submit" form={id} disabled={pending} aria-busy={pending} className={`${submitClassName} disabled:cursor-wait`}>
        {pending && <Spinner />}
        {pending ? 'جارٍ الحفظ…' : submitLabel}
      </button>
      {footer}
      {cancelHref && (
        <Link href={cancelHref} data-cancel="1" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          إلغاء
        </Link>
      )}
    </>
  )

  return (
    <form
      id={id}
      ref={ref}
      className={className}
      noValidate
      // Clear a field's error as soon as the user edits it.
      onChange={() => setDirty(true)}
      onInput={(e) => {
        setDirty(true)
        const el = e.target as Control
        if (el instanceof HTMLInputElement && el.type === 'checkbox') {
          const box = el.closest('[data-group]')
          if (box && ref.current?.querySelector(`input[type=checkbox][name="${el.name}"]:checked`)) box.removeAttribute('data-error')
          return
        }
        if (!el.closest('label')?.hasAttribute('data-error')) return
        let msg = arabicMessage(el)
        const group = oneOf.find((g) => g.fields.includes(el.name))
        if (group && !msg) {
          // Filling one field of the group fixes the whole group.
          group.fields.forEach((n) => {
            const other = ref.current?.elements.namedItem(n)
            if (other && other !== el && (other as Control).closest) setError(other as Control, arabicMessage(other as Control))
          })
          if (!el.value.trim()) msg = group.message
        }
        setError(el, msg)
      }}
      // Submit manually so React does not clear the inputs when the action returns an error.
      onSubmit={(e) => {
        e.preventDefault()
        if (!validate(e.currentTarget)) return
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
        const fd = new FormData(e.currentTarget, submitter)
        setDirty(false)
        startTransition(() => formAction(fd))
      }}
    >
      {showRequiredNote && (
        <p className="col-span-full text-xs text-slate-500">
          الحقول المعلَّمة بـ <RequiredMark /> إلزامية
          {oneOf.length > 0 && (
            <>
              {' · '}
              <span className="text-red-600">*¹</span> يكفي ملء أحدها
            </>
          )}
        </p>
      )}
      {summary && (
        <div className="col-span-full">
          <Alert>{summary}</Alert>
        </div>
      )}
      {state?.error && (
        <div className="col-span-full" role="alert">
          <Alert>{state.error}</Alert>
        </div>
      )}
      {state?.ok && (
        <div className="col-span-full" role="status">
          <Alert kind="success">{state.ok}</Alert>
        </div>
      )}
      {children}
      {actionsTarget ? (target && createPortal(buttons, target)) : <div className="col-span-full flex flex-wrap items-center gap-3">{buttons}</div>}
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
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  )
}
