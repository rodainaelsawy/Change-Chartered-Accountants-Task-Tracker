import Link from 'next/link'
import { bulkAddTasks } from '@/app/actions/templates'
import { ActionForm } from '@/components/action-form'
import { ASSIGNEES_CHECK, AssigneePicker } from '@/components/assignee-picker'
import { BulkRowsEditor } from '@/components/rows-editor'
import { Card, Field, PageHeader, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { addDays, todayIn } from '@/lib/dates'
import { companyOptions, teamMembers } from '@/lib/queries'

export const metadata = { title: 'إضافة عدة مهام' }

export default async function BulkAddPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { org, user } = await requireSession()
  const sp = await searchParams
  const [companies, team] = await Promise.all([companyOptions(org.id), teamMembers(org.id)])
  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/tasks" className="text-brand-700 hover:underline">
          المهام
        </Link>
      </div>
      <PageHeader
        title="إضافة عدة مهام لشركة"
        subtitle={
          <>
            لإضافة نفس المجموعة لعدة شركات استخدم{' '}
            <Link href="/templates" className="text-brand-700 underline">
              قوالب المهام
            </Link>
            .
          </>
        }
      />
      <Card className="max-w-4xl p-5">
        <ActionForm action={bulkAddTasks} submitLabel="إضافة المهام" checkGroups={ASSIGNEES_CHECK}>
          <Field label="الشركة">
            <select name="company_id" required defaultValue={sp.company ?? ''} className={`${inputCls} max-w-md`}>
              <option value="" disabled>
                اختر الشركة…
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <AssigneePicker team={team} selected={[user.id]} />
          <BulkRowsEditor defaultDeadline={addDays(todayIn(org.timezone), 7)} />
        </ActionForm>
      </Card>
    </>
  )
}
