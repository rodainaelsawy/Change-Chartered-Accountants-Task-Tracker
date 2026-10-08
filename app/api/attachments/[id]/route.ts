import { getSession } from '@/lib/auth'
import { one } from '@/lib/db'
import { readFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/** Streams an attachment to a signed-in user of the same organization. ?download=1 forces a download. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('غير مصرح', { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('not found', { status: 404 })

  const a = await one<{ file_name: string; storage_key: string; size_bytes: number }>(
    'select file_name, storage_key, size_bytes from company_attachments where id = $1 and org_id = $2',
    [id, session.org.id],
  )
  if (!a) return new Response('not found', { status: 404 })
  const stream = await readFile(a.storage_key)
  if (!stream) return new Response('الملف غير موجود', { status: 404 })

  const download = new URL(req.url).searchParams.get('download') === '1'
  const ascii = a.file_name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(a.size_bytes),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(a.file_name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
