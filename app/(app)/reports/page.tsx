import Link from 'next/link'
import { PrintButton } from '@/components/print-button'
import { Card, Empty, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, todayIn } from '@/lib/dates'
import { companyOptions } from '@/lib/queries'
import { presets, reportRange } from '@/lib/report-range'
import { companyReport, completedTasks, totals, type CompanyReportRow } from '@/lib/reports'

export const metadata = { title: 'التقارير' }

function RateBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300">—</span>
  const color = value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 print:hidden">
        <span className={`block h-full ${color}`} style={{ width: `${value}%` }} />
      </span>
      <span className="tabular-nums">{value}%</span>
    </span>
  )
}

const NUM = 'px-3 py-2 text-center tabular-nums'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; company?: string; done?: string }>
}) {
  const { org } = await requireSession()
  const sp = await searchParams
  const today = todayIn(org.timezone)
  const { from, to } = reportRange(sp.from, sp.to, today)
  const company = /^[0-9a-f-]{36}$/i.test(sp.company ?? '') ? sp.company : undefined
  const [rows, done, companies] = await Promise.all([
    companyReport(org, from, to, today, company),
    completedTasks(org, from, to, company),
    companyOptions(org.id),
  ])
  const sum = totals(rows)
  const qs = new URLSearchParams({ from, to, ...(company ? { company } : {}) }).toString()
  const showDone = sp.done === '1'

  const Row = ({ r, bold }: { r: Omit<CompanyReportRow, 'company_id' | 'company_name'> & { company_id?: string; company_name: string }; bold?: boolean }) => (
    <tr className={bold ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50'}>
      <td className="px-3 py-2">
        {r.company_id ? (
          <Link href={`/companies/${r.company_id}`} className="hover:text-brand-700 hover:underline">
            {r.company_name}
          </Link>
        ) : (
          r.company_name
        )}
      </td>
      <td className={NUM}>{r.total}</td>
      <td className={NUM}>{r.done}</td>
      <td className={`${NUM} text-emerald-700`}>{r.done_on_time}</td>
      <td className={`${NUM} text-amber-700`}>{r.done_late || <span className="text-slate-300">0</span>}</td>
      <td className={NUM}>{r.open}</td>
      <td className={NUM}>
        {r.overdue ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{r.overdue}</span> : <span className="text-slate-300">0</span>}
      </td>
      <td className="px-3 py-2">
        <RateBar value={r.on_time_rate} />
      </td>
    </tr>
  )

  return (
    <>
      <PageHeader
        title="التقارير"
        subtitle={`${org.name} · من ${formatDate(from)} إلى ${formatDate(to)}`}
        actions={
          <span className="flex gap-2 print:hidden">
            <a href={`/api/export/report?${qs}`} className={btn.secondary}>
              تصدير Excel
            </a>
            <PrintButton className={btn.secondary} />
          </span>
        }
      />

      <Card className="mb-4 p-4 print:hidden">
        <div className="mb-3 flex flex-wrap gap-1">
          {presets(today).map((p) => (
            <Link
              key={p.label}
              href={`/reports?${new URLSearchParams({ from: p.from, to: p.to, ...(company ? { company } : {}) })}`}
              className={`rounded-lg px-3 py-1 text-sm ${p.from === from && p.to === to ? 'bg-brand-50 font-medium text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">من</span>
            <input type="date" name="from" defaultValue={from} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">إلى</span>
            <input type="date" name="to" defaultValue={to} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">الشركة</span>
            <select name="company" defaultValue={company ?? ''} className={inputCls}>
              <option value="">كل الشركات</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className={btn.primary}>عرض</button>
        </form>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['إجمالي المهام', sum.total, 'text-slate-800'],
          ['منجزة في الموعد', sum.done_on_time, 'text-emerald-700'],
          ['متأخرة الآن', sum.overdue, 'text-red-700'],
          ['نسبة الالتزام', sum.on_time_rate === null ? '—' : `${sum.on_time_rate}%`, 'text-brand-800'],
        ].map(([label, value, cls]) => (
          <Card key={label as string} className="p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${cls}`}>{value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">حسب الشركة</h2>
        {rows.length === 0 ? (
          <Empty>لا توجد مهام بمواعيد تسليم في هذه الفترة</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">الشركة</th>
                  <th className="px-3 py-2 font-medium">الإجمالي</th>
                  <th className="px-3 py-2 font-medium">منجزة</th>
                  <th className="px-3 py-2 font-medium">في الموعد</th>
                  <th className="px-3 py-2 font-medium">بعد الموعد</th>
                  <th className="px-3 py-2 font-medium">مفتوحة</th>
                  <th className="px-3 py-2 font-medium">متأخرة الآن</th>
                  <th className="px-3 py-2 text-right font-medium">نسبة الالتزام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <Row key={r.company_id} r={r} />
                ))}
                {rows.length > 1 && <Row r={{ ...sum, company_name: 'الإجمالي' }} bold />}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          تشمل المهام التي يقع موعد تسليمها في الفترة المحددة. نسبة الالتزام = المنجزة في الموعد ÷ (المنجزة + المتأخرة الآن)؛ لا تُحتسب
          المهام التي لم يحن موعدها بعد ولا الملغاة.
        </p>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">
            المهام المنجزة في الفترة ({done.length})
            <span className="ms-2 text-xs font-normal text-slate-500">حسب تاريخ الإنجاز، بغض النظر عن موعد التسليم</span>
          </h2>
          <Link href={`/reports?${qs}${showDone ? '' : '&done=1'}`} className="text-sm text-brand-700 hover:underline print:hidden">
            {showDone ? 'إخفاء' : 'عرض'}
          </Link>
        </div>
        {showDone &&
          (done.length === 0 ? (
            <Empty>لا توجد مهام منجزة في هذه الفترة</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-right text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">المهمة</th>
                    <th className="px-3 py-2 font-medium">الشركة</th>
                    <th className="px-3 py-2 font-medium">المسؤولون</th>
                    <th className="px-3 py-2 font-medium">الموعد</th>
                    <th className="px-3 py-2 font-medium">أُنجزت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {done.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2">
                        <Link href={`/tasks/${t.id}`} className="hover:text-brand-700 hover:underline">
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{t.company_name}</td>
                      <td className="px-3 py-2 text-slate-600">{t.assignees}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(t.deadline, 'short')}</td>
                      <td className={`whitespace-nowrap px-3 py-2 tabular-nums ${t.completed_on <= t.deadline ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {formatDate(t.completed_on, 'short')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </Card>
    </>
  )
}
