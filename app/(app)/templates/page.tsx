import Link from 'next/link'
import { LayoutTemplate } from 'lucide-react'
import { requireSession } from '@/lib/auth'
import { Crumbs, Card, Empty, PageHeader, btn } from '@/components/ui'
import { query } from '@/lib/db'
import { tasksCount } from '@/lib/labels'

export const metadata = { title: 'قوالب المهام' }

export default async function TemplatesPage() {
  const { org } = await requireSession()
  const rows = await query<{ id: string; name: string; description: string | null; items: number; recurring: number }>(
    `select t.id, t.name, t.description,
            (select count(*)::int from task_template_items i where i.template_id = t.id) as items,
            (select count(*)::int from task_template_items i where i.template_id = t.id and i.recurrence is not null) as recurring
       from task_templates t where t.org_id = $1 order by t.name`,
    [org.id],
  )
  return (
    <>
      <Crumbs items={[{ href: '/tasks', label: 'المهام' }]} />
      <PageHeader
        title="قوالب المهام"
        subtitle="مجموعة مهام تُحفظ مرة واحدة وتُطبَّق على شركة أو عدة شركات بضغطة واحدة."
        actions={
          <Link href="/templates/new" className={btn.primary}>
            + قالب جديد
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon={<LayoutTemplate className="h-7 w-7" />} action={{ href: '/templates/new', label: '+ إنشاء أول قالب' }}>
            لا توجد قوالب بعد. مثال: «تأسيس شركة جديدة» أو «الإقرارات الشهرية».
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/templates/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{t.name}</div>
                    {t.description && <div className="truncate text-xs text-slate-500">{t.description}</div>}
                  </div>
                  <span className="shrink-0 text-sm text-slate-500">
                    {tasksCount(t.items)}{t.recurring ? ` · ${t.recurring} متكررة` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
