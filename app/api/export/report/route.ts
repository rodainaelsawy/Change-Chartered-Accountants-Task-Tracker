import { getSession } from '@/lib/auth'
import { todayIn } from '@/lib/dates'
import { addSheet, newWorkbook, xlsxResponse } from '@/lib/excel'
import { companyReport, completedTasks, totals, type CompanyReportRow, type CompletedRow } from '@/lib/reports'
import { reportRange } from '@/lib/report-range'

export const dynamic = 'force-dynamic'

/** Per-company report + completed tasks for a date range, as .xlsx (two sheets). */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return new Response('غير مصرح', { status: 401 })
  const { org } = session
  const sp = new URL(req.url).searchParams
  const today = todayIn(org.timezone)
  const { from, to } = reportRange(sp.get('from'), sp.get('to'), today)
  const company = /^[0-9a-f-]{36}$/i.test(sp.get('company') ?? '') ? sp.get('company')! : undefined

  const rows = await companyReport(org, from, to, today, company)
  const sum = totals(rows)
  const done = await completedTasks(org, from, to, company)

  const wb = newWorkbook()
  addSheet<CompanyReportRow>(
    wb,
    'تقرير الشركات',
    [
      { header: 'الشركة', width: 30, value: (r) => r.company_name },
      { header: 'إجمالي المهام', width: 12, value: (r) => r.total },
      { header: 'منجزة', width: 10, value: (r) => r.done },
      { header: 'في الموعد', width: 10, value: (r) => r.done_on_time },
      { header: 'بعد الموعد', width: 10, value: (r) => r.done_late },
      { header: 'مفتوحة', width: 10, value: (r) => r.open },
      { header: 'متأخرة الآن', width: 11, value: (r) => r.overdue },
      { header: 'ملغاة', width: 9, value: (r) => r.cancelled },
      { header: 'نسبة الالتزام', width: 12, type: 'percent', value: (r) => r.on_time_rate },
    ],
    [...rows, { company_id: '', company_name: 'الإجمالي', ...sum }],
    `${org.name} — تقرير الشركات من ${from} إلى ${to} (حسب موعد التسليم)`,
  )
  addSheet<CompletedRow>(
    wb,
    'المهام المنجزة',
    [
      { header: 'المهمة', width: 40, value: (r) => r.title },
      { header: 'الشركة', width: 28, value: (r) => r.company_name },
      { header: 'المسؤولون', width: 28, value: (r) => r.assignees },
      { header: 'موعد التسليم', width: 14, type: 'date', value: (r) => r.deadline },
      { header: 'تاريخ الإنجاز', width: 14, type: 'date', value: (r) => r.completed_on },
      { header: 'في الموعد', width: 10, value: (r) => (r.completed_on <= r.deadline ? 'نعم' : 'لا') },
    ],
    done,
    `المهام المنجزة من ${from} إلى ${to}`,
  )
  return xlsxResponse(wb, `تقرير-${from}-${to}.xlsx`, `report-${from}-${to}.xlsx`)
}
