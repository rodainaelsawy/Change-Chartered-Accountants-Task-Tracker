import 'server-only'
import { one, query, tx } from './db'
import { deleteFiles } from './storage'
import type { AttachmentKind } from './types'

export const ATTACHMENT_KINDS: AttachmentKind[] = ['commercial_register', 'tax_card', 'other']

export const ATTACHMENT_LABEL: Record<AttachmentKind, string> = {
  commercial_register: 'السجل التجاري',
  tax_card: 'البطاقة الضريبية',
  other: 'مرفقات أخرى',
}

export async function companyInOrg(companyId: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return false
  return Boolean(await one('select 1 from companies where id = $1 and org_id = $2', [companyId, orgId]))
}

/**
 Records an uploaded file. For the single-file kinds (commercial register, tax card) the previous file is
 replaced: its row is removed and its stored file deleted.
*/
export async function recordAttachment(a: {
  orgId: string
  companyId: string
  kind: AttachmentKind
  fileName: string
  size: number
  storageKey: string
  userId: string
}) {
  const replaced = await tx(async (c) => {
    let old: string[] = []
    if (a.kind !== 'other') {
      const r = await c.query(
        'delete from company_attachments where company_id = $1 and kind = $2 returning storage_key',
        [a.companyId, a.kind],
      )
      old = r.rows.map((x) => x.storage_key as string)
    }
    await c.query(
      `insert into company_attachments (org_id, company_id, kind, file_name, size_bytes, storage_key, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [a.orgId, a.companyId, a.kind, a.fileName, a.size, a.storageKey, a.userId],
    )
    return old
  })
  await deleteFiles(replaced)
}

export async function deleteCompanyFiles(companyId: string) {
  const rows = await query<{ storage_key: string }>(
    'select storage_key from company_attachments where company_id = $1',
    [companyId],
  )
  await deleteFiles(rows.map((r) => r.storage_key))
}
