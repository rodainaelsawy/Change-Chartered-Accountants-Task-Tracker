'use server'

import { head } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ATTACHMENT_KINDS, companyInOrg, deleteCompanyFiles, recordAttachment } from '@/lib/attachments'
import { requireAdmin, requireSession } from '@/lib/auth'
import { requireManager } from '@/lib/permissions'
import { decrypt, encrypt } from '@/lib/crypto'
import { one, query, tx } from '@/lib/db'
import { MAX_PDF_BYTES, blobEnabled, companyPrefix, deleteFiles, safeFileName } from '@/lib/storage'
import type { AttachmentKind } from '@/lib/types'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const opt = (fd: FormData, k: string) => str(fd, k) || null

export async function saveCompany(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireManager()
  const id = str(fd, 'id')
  const name = str(fd, 'name')
  if (!name) return { error: 'اسم الشركة مطلوب' }
  if (!str(fd, 'contact_person')) return { error: 'اسم الشخص المسؤول مطلوب' }
  if (!str(fd, 'phone') && !str(fd, 'email')) return { error: 'أدخل رقم الهاتف أو البريد الإلكتروني (واحد على الأقل)' }
  for (const k of ['email', 'tax_email']) {
    const v = str(fd, k)
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: 'البريد الإلكتروني غير صحيح' }
  }

  const dup = await one(
    'select 1 from companies where org_id = $1 and lower(name) = lower($2) and id <> coalesce($3::uuid, gen_random_uuid())',
    [org.id, name, id || null],
  )
  if (dup) return { error: 'توجد شركة بنفس الاسم بالفعل' }

  const values = [
    name,
    opt(fd, 'activity'),
    opt(fd, 'contact_person'),
    opt(fd, 'email'),
    opt(fd, 'phone'),
    opt(fd, 'notes'),
    opt(fd, 'tax_email'),
    opt(fd, 'tax_username'),
  ]
  // Tax password: a new value replaces the old one; empty keeps it; the "clear" box removes it.
  const newPassword = String(fd.get('tax_password') ?? '')
  const clearPassword = fd.get('tax_password_clear') === 'on'

  let companyId = id
  if (id) {
    const r = await query(
      `update companies set name=$3, activity=$4, contact_person=$5, email=$6, phone=$7, notes=$8, tax_email=$9, tax_username=$10,
              tax_password_enc = case when $11::text is not null then $11 when $12 then null else tax_password_enc end
        where id = $1 and org_id = $2 returning id`,
      [id, org.id, ...values, newPassword ? encrypt(newPassword) : null, clearPassword],
    )
    if (!r.length) return { error: 'الشركة غير موجودة' }
  } else {
    const r = (await one<{ id: string }>(
      `insert into companies (org_id, name, activity, contact_person, email, phone, notes, tax_email, tax_username, tax_password_enc, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [org.id, ...values, newPassword ? encrypt(newPassword) : null, user.id],
    ))!
    companyId = r.id
  }
  revalidatePath('/companies')
  redirect(`/companies/${companyId}?msg=${id ? 'company_saved' : 'company_created'}${fd.get('tab') === 'tax' ? '&tab=tax' : ''}`)
}

/** Returns the decrypted tax-portal password (only when the user clicks "show" or "copy"). */
export async function revealTaxPassword(companyId: string): Promise<string | null> {
  const { org } = await requireSession()
  const r = await one<{ tax_password_enc: string | null }>(
    'select tax_password_enc from companies where id = $1 and org_id = $2',
    [companyId, org.id],
  )
  return r?.tax_password_enc ? decrypt(r.tax_password_enc) : null
}

export async function setCompanyArchived(id: string, archived: boolean) {
  const { org } = await requireManager()
  await query(`update companies set archived_at = ${archived ? 'now()' : 'null'} where id = $1 and org_id = $2`, [id, org.id])
  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
}

export async function deleteCompany(id: string) {
  const { org } = await requireAdmin()
  if (!(await companyInOrg(id, org.id))) redirect('/companies')
  await deleteCompanyFiles(id)
  await query('delete from companies where id = $1 and org_id = $2', [id, org.id])
  revalidatePath('/', 'layout')
  redirect('/companies?msg=company_deleted')
}

// ---------- Attachments ----------

/** Records a file the browser uploaded directly to Vercel Blob (production). */
export async function confirmBlobUpload(input: {
  companyId: string
  kind: AttachmentKind
  pathname: string
  fileName: string
}): Promise<{ error?: string }> {
  const { user, org } = await requireManager()
  if (!blobEnabled()) return { error: 'التخزين غير مفعّل' }
  if (!ATTACHMENT_KINDS.includes(input.kind)) return { error: 'نوع المرفق غير صحيح' }
  if (!(await companyInOrg(input.companyId, org.id))) return { error: 'الشركة غير موجودة' }
  if (!input.pathname.startsWith(companyPrefix(org.id, input.companyId))) return { error: 'مسار غير صحيح' }
  const meta = await head(input.pathname)
  if (meta.contentType !== 'application/pdf' || meta.size > MAX_PDF_BYTES) {
    await deleteFiles([input.pathname])
    return { error: 'الملف يجب أن يكون PDF بحجم 10 ميجابايت أو أقل' }
  }
  await recordAttachment({
    orgId: org.id,
    companyId: input.companyId,
    kind: input.kind,
    fileName: safeFileName(input.fileName),
    size: meta.size,
    storageKey: input.pathname,
    userId: user.id,
  })
  revalidatePath(`/companies/${input.companyId}`)
  return {}
}

export async function deleteAttachment(id: string) {
  const { org } = await requireManager()
  const r = await one<{ storage_key: string; company_id: string }>(
    'delete from company_attachments where id = $1 and org_id = $2 returning storage_key, company_id',
    [id, org.id],
  )
  if (!r) return
  await deleteFiles([r.storage_key])
  revalidatePath(`/companies/${r.company_id}`)
}

// ---------- Import ----------

export type ImportRow = {
  name: string
  activity?: string
  contact_person?: string
  email?: string
  phone?: string
  notes?: string
  tax_email?: string
  tax_username?: string
  tax_password?: string
}

/** Bulk import of companies with their tax data (no attachments). Rows whose name already exists are skipped. */
export async function importCompanies(rows: ImportRow[]): Promise<{ added: number; skipped: number; error?: string }> {
  const { user, org } = await requireManager()
  const t = (v: unknown) => String(v ?? '').trim() || null
  const clean = rows
    .map((r) => ({
      name: String(r.name ?? '').trim(),
      activity: t(r.activity),
      contact_person: t(r.contact_person),
      email: t(r.email),
      phone: t(r.phone),
      notes: t(r.notes),
      tax_email: t(r.tax_email),
      tax_username: t(r.tax_username),
      tax_password: t(r.tax_password),
    }))
    .filter((r) => r.name && r.contact_person && (r.phone || r.email))
  if (clean.length > 5000) return { added: 0, skipped: 0, error: 'الحد الأقصى 5000 صف في المرة الواحدة' }

  const added = await tx(async (c) => {
    const existing = new Set(
      (await c.query('select lower(name) as n from companies where org_id = $1', [org.id])).rows.map((r) => r.n as string),
    )
    let n = 0
    for (const r of clean) {
      const k = r.name.toLowerCase()
      if (existing.has(k)) continue
      existing.add(k)
      await c.query(
        `insert into companies (org_id, name, activity, contact_person, email, phone, notes, tax_email, tax_username, tax_password_enc, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          org.id,
          r.name,
          r.activity,
          r.contact_person,
          r.email,
          r.phone,
          r.notes,
          r.tax_email,
          r.tax_username,
          r.tax_password ? encrypt(r.tax_password) : null,
          user.id,
        ],
      )
      n++
    }
    return n
  })
  revalidatePath('/companies')
  return { added, skipped: rows.length - added }
}
