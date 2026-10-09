'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { TASK_FILTER_KEYS } from '@/lib/queries'

/** Saves the current task-list filters under a name, for this user only ("الفلاتر المحفوظة"). */
export async function saveFilter(name: string, qs: string): Promise<{ error?: string }> {
  const { user, org } = await requireSession()
  const clean = name.trim().slice(0, 60)
  if (!clean) return { error: 'اكتب اسمًا للفلتر' }
  const src = new URLSearchParams(qs)
  const kept = new URLSearchParams()
  for (const k of TASK_FILTER_KEYS) if (src.get(k)) kept.set(k, src.get(k)!)
  if (!kept.size) return { error: 'اختر فلترًا واحدًا على الأقل ثم احفظه' }
  await query(
    `insert into saved_filters (org_id, user_id, name, query) values ($1, $2, $3, $4)
     on conflict (user_id, name) do update set query = excluded.query`,
    [org.id, user.id, clean, kept.toString()],
  )
  revalidatePath('/tasks')
  return {}
}

export async function deleteFilter(id: string) {
  const { user } = await requireSession()
  if (!/^[0-9a-f-]{36}$/i.test(id)) return
  await query('delete from saved_filters where id = $1 and user_id = $2', [id, user.id])
  revalidatePath('/tasks')
}
