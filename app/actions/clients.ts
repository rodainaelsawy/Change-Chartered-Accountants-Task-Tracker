'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { one, query, tx } from '@/lib/db'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const opt = (fd: FormData, k: string) => str(fd, k) || null

export async function saveClient(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireSession()
  const id = str(fd, 'id')
  const name = str(fd, 'name')
  if (!name) return { error: 'اسم العميل مطلوب' }
  const values = [name, opt(fd, 'company'), opt(fd, 'contact_person'), opt(fd, 'email'), opt(fd, 'phone'), opt(fd, 'notes')]

  const dup = await one(
    'select 1 from clients where org_id = $1 and lower(name) = lower($2) and id <> coalesce($3::uuid, gen_random_uuid())',
    [org.id, name, id || null],
  )
  if (dup) return { error: 'يوجد عميل بنفس الاسم بالفعل' }

  let clientId = id
  if (id) {
    const r = await query(
      `update clients set name=$3, company=$4, contact_person=$5, email=$6, phone=$7, notes=$8
        where id = $1 and org_id = $2 returning id`,
      [id, org.id, ...values],
    )
    if (!r.length) return { error: 'العميل غير موجود' }
  } else {
    const r = (await one<{ id: string }>(
      `insert into clients (org_id, name, company, contact_person, email, phone, notes, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [org.id, ...values, user.id],
    ))!
    clientId = r.id
  }
  revalidatePath('/clients')
  redirect(`/clients/${clientId}`)
}

export async function setClientArchived(id: string, archived: boolean) {
  const { org } = await requireSession()
  await query(`update clients set archived_at = ${archived ? 'now()' : 'null'} where id = $1 and org_id = $2`, [id, org.id])
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
}

export async function deleteClient(id: string) {
  const { org } = await requireSession()
  await query('delete from clients where id = $1 and org_id = $2', [id, org.id])
  revalidatePath('/', 'layout')
  redirect('/clients')
}

export type ImportRow = {
  name: string
  company?: string
  contact_person?: string
  email?: string
  phone?: string
  notes?: string
}

/** Bulk import of clients (FR-8.4). Rows whose name already exists are skipped. */
export async function importClients(rows: ImportRow[]): Promise<{ added: number; skipped: number; error?: string }> {
  const { user, org } = await requireSession()
  const clean = rows
    .map((r) => ({
      name: String(r.name ?? '').trim(),
      company: String(r.company ?? '').trim() || null,
      contact_person: String(r.contact_person ?? '').trim() || null,
      email: String(r.email ?? '').trim() || null,
      phone: String(r.phone ?? '').trim() || null,
      notes: String(r.notes ?? '').trim() || null,
    }))
    .filter((r) => r.name)
  if (clean.length > 5000) return { added: 0, skipped: 0, error: 'الحد الأقصى 5000 صف في المرة الواحدة' }

  const added = await tx(async (c) => {
    const existing = new Set(
      (await c.query('select lower(name) as n from clients where org_id = $1', [org.id])).rows.map((r) => r.n as string),
    )
    let n = 0
    for (const r of clean) {
      const key = r.name.toLowerCase()
      if (existing.has(key)) continue
      existing.add(key)
      await c.query(
        `insert into clients (org_id, name, company, contact_person, email, phone, notes, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [org.id, r.name, r.company, r.contact_person, r.email, r.phone, r.notes, user.id],
      )
      n++
    }
    return n
  })
  revalidatePath('/clients')
  return { added, skipped: rows.length - added }
}
