'use client'

import { useState, useTransition } from 'react'
import { resendInvite } from '@/app/actions/settings'
import { btn } from '@/components/ui'

/** Creates a fresh invitation link (and emails it when email is configured), then shows it for copying. */
export function InviteLinkButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (link) {
    return (
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="ltr w-64 rounded border border-slate-300 px-2 py-1 text-xs"
        autoFocus
      />
    )
  }
  return (
    <button
      className={btn.ghost}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await resendInvite(userId)
          setLink(r?.ok ?? r?.error ?? '')
        })
      }
    >
      رابط الدعوة
    </button>
  )
}
