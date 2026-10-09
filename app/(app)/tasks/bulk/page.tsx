import Link from 'next/link'
import { requireManager } from '@/lib/permissions'
import { bulkAddTasks } from '@/app/actions/templates'
import { ActionForm } from '@/components/action-form'
import { ASSIGNEES_CHECK, AssigneePicker } from '@/components/assignee-picker'
import { BulkRowsEditor } from '@/components/rows-editor'
import { CompanyCombobox } from '@/components/form-inputs'
import { SideTips } from '@/components/side-tips'
import { Crumbs, Card, Field, PageHeader } from '@/components/ui'
import { addDays, todayIn } from '@/lib/dates'
import { companyOptions, teamMembers } from '@/lib/queries'

export const metadata = { title: 'إضافة عدة مهام' }

export default async function BulkAddPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const { org, user } = await requireManager()
  const sp = await searchParams
  const [companies, team] = await Promise.all([companyOptions(org.id), teamMembers(org.id)])
  return (
    <>
      <Crumbs items={[{ href: '/tasks', label: 'المهام' }]} />
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
      <div className="grid gap-6 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2">
        <ActionForm action={bulkAddTasks} submitLabel="إضافة المهام" checkGroups={ASSIGNEES_CHECK} cancelHref={sp.company ? `/companies/${sp.company}` : '/tasks'}>
          <Field label="الشركة">
            <CompanyCombobox name="company_id" required companies={companies} defaultValue={sp.company} />
          </Field>
          <AssigneePicker team={team} selected={[user.id]} />
          <BulkRowsEditor defaultDeadline={addDays(todayIn(org.timezone), 7)} />
        </ActionForm>
      </Card>
      <SideTips
        items={[
          'كل المهام تُضاف لنفس الشركة ولنفس المسؤولين.',
          'الصف الأول إلزامي، والصفوف التي ليس لها عنوان يتم تجاهلها.',
          'لتكرار نفس المجموعة لعدة شركات أو كل شهر استخدم القوالب.',
        ]}
        links={[{ href: '/templates', label: 'قوالب المهام' }]}
      />
      </div>
    </>
  )
}
