'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setUserRole } from '@/app/actions/settings'
import { ROLE_HINT, ROLE_LABEL } from '@/lib/labels'
import type { UserRole } from '@/lib/types'
import { useToast } from './toast'

/** Changes a team member's role after confirmation (permission change → H5 error prevention). */
export function RoleSelect({ userId, name, role }: { userId: string; name: string; role: UserRole }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const toast = useToast()
  return (
    <select
      aria-label={`صلاحية ${name}`}
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as UserRole
        if (!window.confirm(`تغيير صلاحية ${name} إلى «${ROLE_LABEL[next]}»؟\n${ROLE_HINT[next]}`)) {
          e.target.value = role
          return
        }
        start(async () => {
          await setUserRole(userId, next)
          router.refresh()
          toast({ message: `أصبح ${name} «${ROLE_LABEL[next]}»` })
        })
      }}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
    >
      {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  )
}
