import { getSession } from '@/lib/auth'
import { todayIn } from '@/lib/dates'
import { addSheet, newWorkbook, xlsxResponse } from '@/lib/excel'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'
import { listTasks, parseTaskFilters } from '@/lib/queries'
import type { Task } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** The task list as .xlsx, with the same filters as the /tasks page (passed as query parameters). */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return new Response('غير مصرح', { status: 401 })
  const { org, user } = session
  const sp = new URL(req.url).searchParams
  const today = todayIn(org.timezone)
  const tasks = await listTasks(org.id, parseTaskFilters((k) => sp.get(k) ?? '', user.id), today, 10000)

  const wb = newWorkbook()
  addSheet<Task>(
    wb,
    'المهام',
    [
      { header: 'المهمة', width: 40, value: (t) => t.title },
      { header: 'الشركة', width: 28, value: (t) => t.company_name },
      { header: 'المسؤولون', width: 28, value: (t) => (t.assignees ?? []).map((a) => a.name).join('، ') },
      { header: 'موعد التسليم', width: 14, type: 'date', value: (t) => t.deadline },
      { header: 'الأولوية', width: 10, value: (t) => PRIORITY_LABEL[t.priority] },
      { header: 'الحالة', width: 12, value: (t) => STATUS_LABEL[t.status] },
      {
        header: 'متأخرة',
        width: 9,
        value: (t) => (['not_started', 'in_progress', 'on_hold'].includes(t.status) && t.deadline < today ? 'نعم' : ''),
      },
      { header: 'الخطوات', width: 10, value: (t) => (t.checklist_total ? `${t.checklist_done}/${t.checklist_total}` : '') },
      { header: 'متكررة', width: 9, value: (t) => (t.series_id ? 'نعم' : '') },
      { header: 'الوصف', width: 40, value: (t) => t.description },
    ],
    tasks,
    `${org.name} — المهام (${today})`,
  )
  return xlsxResponse(wb, `المهام-${today}.xlsx`, `tasks-${today}.xlsx`)
}
