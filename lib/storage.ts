import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { del, get } from '@vercel/blob'

/*
 File storage for attachments.
  - Production (Vercel): Vercel Blob, private store. Enabled when BLOB_READ_WRITE_TOKEN is set.
    Browsers upload directly to Blob (see /api/attachments/upload) and download only through
    /api/attachments/[id], which checks the session first.
  - Local development (no token): files are written to the .uploads/ folder in the project.
*/

export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

const LOCAL_DIR = path.join(process.cwd(), '.uploads')

function localPath(key: string) {
  const p = path.resolve(LOCAL_DIR, key)
  if (!p.startsWith(LOCAL_DIR + path.sep)) throw new Error('invalid storage key')
  return p
}

/** Folder that every attachment of a company must live in. Used to validate client-side uploads. */
export const companyPrefix = (orgId: string, companyId: string) => `orgs/${orgId}/companies/${companyId}/`

export async function saveLocalFile(key: string, data: Buffer) {
  const p = localPath(key)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, data)
}

export async function readFile(key: string): Promise<ReadableStream<Uint8Array> | null> {
  if (blobEnabled()) {
    const r = await get(key, { access: 'private' })
    return r?.statusCode === 200 ? r.stream : null
  }
  try {
    const handle = await fs.open(localPath(key))
    return Readable.toWeb(handle.createReadStream()) as ReadableStream<Uint8Array>
  } catch {
    return null
  }
}

export async function deleteFiles(keys: string[]) {
  if (!keys.length) return
  try {
    if (blobEnabled()) await del(keys)
    else await Promise.all(keys.map((k) => fs.rm(localPath(k), { force: true })))
  } catch (e) {
    console.error('[storage] failed to delete', keys, e)
  }
}

export function isPdf(head: Uint8Array) {
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 // "%PDF"
}

export function safeFileName(name: string) {
  const base = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 150) || 'file.pdf'
  return /\.pdf$/i.test(base) ? base : base + '.pdf'
}
