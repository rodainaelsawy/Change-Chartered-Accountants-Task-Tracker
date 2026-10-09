'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { confirmBlobUpload, deleteAttachment } from '@/app/actions/companies'
import type { AttachmentKind } from '@/lib/types'

const MAX = 10 * 1024 * 1024

export type FileRow = { id: string; file_name: string; size_bytes: number; uploaded: string; by: string | null }

const fmtSize = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} ك.ب` : `${(n / 1024 / 1024).toFixed(1)} م.ب`

/** One upload area (PDF only, ≤ 10 MB). For single-file kinds a new upload replaces the existing file. */
export function AttachmentZone({
  companyId,
  kind,
  label,
  multiple,
  files,
  blobMode,
  prefix,
  readOnly = false,
}: {
  companyId: string
  kind: AttachmentKind
  label: string
  multiple: boolean
  files: FileRow[]
  blobMode: boolean
  prefix: string
  /** View/download only (followers). */
  readOnly?: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)

  async function uploadOne(file: File) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error(`"${file.name}" ليس ملف PDF`)
    if (file.size > MAX) throw new Error(`"${file.name}" أكبر من 10 ميجابايت`)
    if (blobMode) {
      const { upload } = await import('@vercel/blob/client')
      const blob = await upload(`${prefix}${kind}/file.pdf`, file, {
        access: 'private',
        handleUploadUrl: '/api/attachments/upload',
        clientPayload: JSON.stringify({ companyId, kind }),
        contentType: 'application/pdf',
      })
      const r = await confirmBlobUpload({ companyId, kind, pathname: blob.pathname, fileName: file.name })
      if (r.error) throw new Error(r.error)
    } else {
      const fd = new FormData()
      fd.set('companyId', companyId)
      fd.set('kind', kind)
      fd.set('file', file)
      const res = await fetch('/api/attachments/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'تعذّر رفع الملف')
    }
  }

  async function handle(list: FileList | null) {
    if (!list?.length) return
    const chosen = multiple ? Array.from(list) : [list[0]]
    if (!multiple && files.length && !window.confirm(`سيتم استبدال "${files[0].file_name}". متابعة؟`)) return
    setError('')
    try {
      for (const [i, f] of chosen.entries()) {
        setBusy(chosen.length > 1 ? `جارٍ رفع ${i + 1} من ${chosen.length}…` : 'جارٍ الرفع…')
        await uploadOne(f)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر رفع الملف')
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
      router.refresh()
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{label}</h3>
        <span className="text-xs text-slate-400">{multiple ? 'PDF · عدة ملفات' : 'PDF · ملف واحد'}</span>
      </div>

      {files.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-600">
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/attachments/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-slate-800 hover:text-brand-700 hover:underline"
                >
                  {f.file_name}
                </a>
                <div className="text-xs text-slate-400">
                  {fmtSize(f.size_bytes)} · {f.uploaded}
                  {f.by && ` · ${f.by}`}
                </div>
              </div>
              <a href={`/api/attachments/${f.id}?download=1`} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                تحميل
              </a>
              {!readOnly && <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`حذف "${f.file_name}"؟`)) return
                  await deleteAttachment(f.id)
                  router.refresh()
                }}
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                حذف
              </button>}
            </li>
          ))}
        </ul>
      )}

      {readOnly ? (
        files.length === 0 && <p className="text-sm text-slate-400">لا توجد ملفات</p>
      ) : (
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (!busy) handle(e.dataTransfer.files)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition ${
          drag ? 'border-brand-600 bg-brand-50' : 'border-slate-300 hover:border-brand-600 hover:bg-brand-50'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span className="font-medium text-slate-700">
          {busy ?? (files.length && !multiple ? 'استبدال الملف' : multiple ? 'اختر ملفات PDF أو اسحبها هنا' : 'اختر ملف PDF أو اسحبه هنا')}
        </span>
        <span className="mt-0.5 text-xs text-slate-400">الحد الأقصى 10 ميجابايت للملف</span>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="sr-only"
          disabled={Boolean(busy)}
          onChange={(e) => handle(e.target.files)}
        />
      </label>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
