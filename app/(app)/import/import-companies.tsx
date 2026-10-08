'use client'

import Link from 'next/link'
import Papa from 'papaparse'
import { useState, useTransition } from 'react'
import { importCompanies, type ImportRow } from '@/app/actions/companies'
import { Alert, btn } from '@/components/ui'

type FieldKey = keyof ImportRow

const FIELDS: { key: FieldKey; label: string; aliases: string[] }[] = [
  { key: 'name', label: 'اسم الشركة', aliases: ['اسم الشركة', 'الشركة', 'اسم العميل', 'العميل', 'الاسم', 'اسم', 'name', 'company', 'company name', 'client'] },
  { key: 'activity', label: 'النشاط', aliases: ['النشاط', 'نوع النشاط', 'activity', 'business', 'industry'] },
  { key: 'contact_person', label: 'الشخص المسؤول', aliases: ['المسؤول', 'الشخص المسؤول', 'جهة الاتصال', 'contact', 'contact person'] },
  { key: 'phone', label: 'الهاتف', aliases: ['الهاتف', 'رقم الهاتف', 'التليفون', 'الموبايل', 'الجوال', 'تليفون', 'موبايل', 'phone', 'mobile', 'tel'] },
  { key: 'email', label: 'البريد الإلكتروني', aliases: ['البريد', 'البريد الإلكتروني', 'الايميل', 'الإيميل', 'email', 'e-mail', 'mail'] },
  { key: 'notes', label: 'ملاحظات', aliases: ['ملاحظات', 'ملاحظة', 'notes', 'note', 'remarks'] },
  { key: 'tax_email', label: 'البريد الضريبي', aliases: ['البريد الضريبي', 'ايميل الضرائب', 'إيميل الضرائب', 'ايميل المنظومة', 'tax email'] },
  { key: 'tax_username', label: 'اسم المستخدم (الضرائب)', aliases: ['اسم المستخدم', 'المستخدم', 'يوزر', 'اليوزر', 'username', 'user name', 'tax username'] },
  { key: 'tax_password', label: 'كلمة المرور (الضرائب)', aliases: ['كلمة المرور', 'كلمة السر', 'الباسورد', 'باسورد', 'password', 'tax password'] },
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\s_\-:]+/g, ' ')
    .trim()

function guessMapping(headers: string[]): Record<FieldKey, number> {
  const map = {} as Record<FieldKey, number>
  for (const f of FIELDS) {
    const aliases = f.aliases.map(norm)
    map[f.key] = headers.findIndex((h) => aliases.includes(norm(h)))
  }
  if (map.name < 0) map.name = 0
  return map
}

const cellText = (v: unknown) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim())

const TEMPLATE =
  '\ufeffاسم الشركة,النشاط,الشخص المسؤول,الهاتف,البريد الإلكتروني,ملاحظات,البريد الضريبي,اسم المستخدم,كلمة المرور\nشركة النور للتجارة,تجارة,أحمد علي,01000000000,info@example.com,,tax@example.com,alnoor,\n'

export function ImportCompanies() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [map, setMap] = useState<Record<FieldKey, number> | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)
  const [pending, start] = useTransition()

  async function onFile(file: File) {
    setError('')
    setResult(null)
    setFileName(file.name)
    try {
      let data: string[][]
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        data = ((await readSheet(file)) as unknown[][]).map((r) => r.map(cellText))
      } else if (/\.(csv|txt)$/i.test(file.name)) {
        const text = await file.text()
        data = Papa.parse<string[]>(text, { skipEmptyLines: true }).data.map((r) => r.map(cellText))
      } else {
        throw new Error('الملف يجب أن يكون ‎.xlsx أو ‎.csv (ملفات ‎.xls القديمة: احفظها أولًا بصيغة ‎.xlsx من Excel)')
      }
      data = data.filter((r) => r.some((c) => c !== ''))
      if (data.length < 2) throw new Error('الملف لا يحتوي على بيانات (الصف الأول يجب أن يكون عناوين الأعمدة)')
      setHeaders(data[0])
      setRows(data.slice(1))
      setMap(guessMapping(data[0]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّرت قراءة الملف')
      setHeaders([])
      setRows([])
      setMap(null)
    }
  }

  const mapped: ImportRow[] = map
    ? rows.map((r) => {
        const o = {} as ImportRow
        for (const f of FIELDS) o[f.key] = map[f.key] >= 0 ? (r[map[f.key]] ?? '') : ''
        return o
      })
    : []
  const valid = mapped.filter((r) => r.name)

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm text-slate-600">
        <p>الصف الأول في الملف يجب أن يحتوي على عناوين الأعمدة. سيتم التعرف على الأعمدة تلقائيًا ويمكنك تعديلها قبل الاستيراد.</p>
        <p>
          الشركات الموجودة بنفس الاسم يتم تخطيها. كلمات المرور تُحفظ مشفّرة. المرفقات تُضاف من صفحة كل شركة.{' '}
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
            download="companies-template.csv"
            className="text-brand-700 underline"
          >
            تحميل نموذج فارغ
          </a>
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-brand-600 hover:bg-brand-50">
        <span className="font-medium text-slate-700">{fileName || 'اختر ملف Excel أو CSV'}</span>
        <span className="mt-1 text-xs text-slate-500">‎.xlsx / .csv</span>
        <input
          type="file"
          accept=".xlsx,.csv,.txt"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {error && <Alert>{error}</Alert>}
      {result && (
        <Alert kind="success">
          تم استيراد {result.added} شركة{result.skipped > 0 && ` · تم تخطي ${result.skipped} (مكرر أو بدون اسم)`}.{' '}
          <Link href="/companies" className="underline">
            عرض الشركات
          </Link>
        </Alert>
      )}

      {map && !result && (
        <>
          <div>
            <h3 className="mb-2 font-semibold">ربط الأعمدة</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key} className="text-sm">
                  <span className="mb-1 block text-slate-600">
                    {f.label}
                    {f.key === 'name' && ' *'}
                  </span>
                  <select
                    value={map[f.key]}
                    onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value={-1}>— لا يوجد —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">
              معاينة ({valid.length} صف{rows.length !== valid.length && ` · ${rows.length - valid.length} بدون اسم`})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-right text-slate-500">
                  <tr>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="whitespace-nowrap px-3 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {valid.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      {FIELDS.map((f) => (
                        <td key={f.key} className="max-w-48 truncate px-3 py-2">
                          {f.key === 'tax_password' && r[f.key] ? '••••••' : r[f.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {valid.length > 10 && <p className="mt-1 text-xs text-slate-500">يتم عرض أول 10 صفوف فقط.</p>}
          </div>

          <button
            className={btn.primary}
            disabled={pending || valid.length === 0}
            onClick={() =>
              start(async () => {
                const r = await importCompanies(valid)
                if (r.error) setError(r.error)
                else setResult({ added: r.added, skipped: r.skipped + (rows.length - valid.length) })
              })
            }
          >
            {pending ? 'جارٍ الاستيراد…' : `استيراد ${valid.length} شركة`}
          </button>
        </>
      )}
    </div>
  )
}
