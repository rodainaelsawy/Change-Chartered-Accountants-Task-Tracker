import crypto from 'node:crypto'
import { canManage } from '@/lib/permissions'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { ATTACHMENT_KINDS, companyInOrg, recordAttachment } from '@/lib/attachments'
import { getSession } from '@/lib/auth'
import { MAX_PDF_BYTES, blobEnabled, companyPrefix, isPdf, safeFileName, saveLocalFile } from '@/lib/storage'
import type { AttachmentKind } from '@/lib/types'

export const dynamic = 'force-dynamic'

const err = (message: string, status = 400) => Response.json({ error: message }, { status })

/*
 Two modes:
  - Vercel Blob (production): JSON body from the browser's `upload()` call. We only issue a short-lived
    upload token, limited to PDFs ≤ 10 MB under this company's folder. The browser then uploads straight
    to Blob and calls the `confirmBlobUpload` server action to record the file.
  - Local development: multipart form with the file itself, saved under .uploads/.
*/
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return err('غير مصرح', 401)
  if (!canManage(session.user)) return err('ليست لديك صلاحية رفع الملفات', 403)
  const { org, user } = session

  if (blobEnabled()) {
    const body = (await req.json()) as HandleUploadBody
    try {
      const result = await handleUpload({
        request: req,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const { companyId, kind } = JSON.parse(clientPayload ?? '{}') as { companyId?: string; kind?: AttachmentKind }
          if (!companyId || !kind || !ATTACHMENT_KINDS.includes(kind)) throw new Error('بيانات غير صحيحة')
          if (!(await companyInOrg(companyId, org.id))) throw new Error('الشركة غير موجودة')
          if (!pathname.startsWith(companyPrefix(org.id, companyId))) throw new Error('مسار غير صحيح')
          return {
            allowedContentTypes: ['application/pdf'],
            maximumSizeInBytes: MAX_PDF_BYTES,
            addRandomSuffix: true,
          }
        },
      })
      return Response.json(result)
    } catch (e) {
      return err(e instanceof Error ? e.message : 'تعذّر الرفع')
    }
  }

  // ---- Local development: store on disk ----
  const fd = await req.formData()
  const companyId = String(fd.get('companyId') ?? '')
  const kind = String(fd.get('kind') ?? '') as AttachmentKind
  const file = fd.get('file')
  if (!ATTACHMENT_KINDS.includes(kind) || !(file instanceof File)) return err('بيانات غير صحيحة')
  if (!(await companyInOrg(companyId, org.id))) return err('الشركة غير موجودة', 404)
  if (file.size > MAX_PDF_BYTES) return err('حجم الملف أكبر من 10 ميجابايت')
  const data = Buffer.from(await file.arrayBuffer())
  if (!isPdf(data)) return err('الملف يجب أن يكون PDF')

  const fileName = safeFileName(file.name)
  const key = `${companyPrefix(org.id, companyId)}${kind}/${crypto.randomUUID()}.pdf`
  await saveLocalFile(key, data)
  await recordAttachment({ orgId: org.id, companyId, kind, fileName, size: data.length, storageKey: key, userId: user.id })
  return Response.json({ ok: true })
}
