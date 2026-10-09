import Link from 'next/link'
import { requireSession } from '@/lib/auth'
import { canManage } from '@/lib/permissions'
import { notFound } from 'next/navigation'
import { applyTemplate, deleteTemplate } from '@/app/actions/templates'
import { ActionForm, ConfirmButton } from '@/components/action-form'
import { ASSIGNEES_CHECK, AssigneePicker } from '@/components/assignee-picker'
import { CompanyPicker } from '@/components/company-picker'
import type { TemplateItem } from '@/components/rows-editor'
import { TemplateForm } from '@/components/template-form'
import { Crumbs, Card, Field, PageHeader, btn, inputCls } from '@/components/ui'
import { one, query } from '@/lib/db'
import { todayIn } from '@/lib/dates'
import { FREQ_LABEL, PRIORITY_LABEL, tasksCount } from '@/lib/labels'
import { companyOptions, teamMembers } from '@/lib/queries'
import type { RecurrenceFreq, TaskPriority } from '@/lib/types'

export const metadata = { title: 'قالب مهام' }

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { org, user } = await requireSession()
  const { id } = await params
  const sp = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const template = await one<{ id: string; name: string; description: string | null }>(
    'select id, name, description from task_templates where id = $1 and org_id = $2',
    [id, org.id],
  )
  if (!template) notFound()
  const [items, companies, team] = await Promise.all([
    query<TemplateItem>(
      'select title, offset_days, priority, recurrence, checklist from task_template_items where template_id = $1 order by position',
      [id],
    ),
    companyOptions(org.id),
    teamMembers(org.id),
  ])

  return (
    <>
      <Crumbs items={[{ href: '/templates', label: 'قوالب المهام' }]} />
      <PageHeader title={template.name} subtitle={template.description ?? tasksCount(items.length)} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-1 font-semibold">تطبيق القالب</h2>
          <p className="mb-4 text-sm text-slate-500">يُنشئ كل مهام القالب لكل شركة تختارها.</p>
          <ActionForm action={applyTemplate} submitLabel="إنشاء المهام" checkGroups={[...ASSIGNEES_CHECK, { name: 'companies', message: 'اختر شركة واحدة على الأقل' }]}>
            <input type="hidden" name="template_id" value={template.id} />
            <CompanyPicker companies={companies} />
            <Field label="تاريخ البداية" hint="تُحسب مواعيد المهام من هذا التاريخ.">
              <input name="start_date" type="date" required defaultValue={todayIn(org.timezone)} className={`${inputCls} max-w-xs`} />
            </Field>
            <AssigneePicker team={team} selected={[user.id]} />
          </ActionForm>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">مهام القالب ({items.length})</h2>
          <ol className="space-y-2 text-sm">
            {items.map((it, i) => (
              <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="font-medium text-slate-800">
                  {i + 1}. {it.title}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span>{it.offset_days === 0 ? 'في تاريخ البداية' : `بعد ${it.offset_days} يوم`}</span>
                  <span>{PRIORITY_LABEL[it.priority as TaskPriority]}</span>
                  {it.recurrence && <span>↻ {FREQ_LABEL[it.recurrence as RecurrenceFreq]}</span>}
                  {it.checklist && <span>☑ {it.checklist.split('\n').length} خطوات</span>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {canManage(user) && (
      <>
      <Card className="mt-6 p-5">
        <details open={Boolean(sp.edit)}>
          <summary className="cursor-pointer font-semibold">تعديل القالب</summary>
          <div className="mt-4">
            <TemplateForm template={template} items={items} />
          </div>
        </details>
      </Card>
      <div className="mt-4 max-w-xs">
        <ConfirmButton action={deleteTemplate.bind(null, template.id)} confirmText={`حذف القالب «${template.name}»؟ (المهام التي أُنشئت منه لا تتأثر)`} className={`${btn.danger} w-full`}>
          حذف القالب
        </ConfirmButton>
      </div>
      </>
      )}
    </>
  )
}
