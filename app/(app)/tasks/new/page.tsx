import Link from 'next/link'
import { TaskForm } from '@/components/task-form'
import { Alert, Card, PageHeader, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { addDays, todayIn } from '@/lib/dates'
import { companyOptions, teamMembers } from '@/lib/queries'

export const metadata = { title: 'مهمة جديدة' }

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; added?: string }>
}) {
  const { org, user } = await requireSession()
  const sp = await searchParams
  const [companies, team] = await Promise.all([companyOptions(org.id), teamMembers(org.id)])

  return (
    <>
      <PageHeader
        title="مهمة جديدة"
        subtitle={
          <>
            أو{' '}
            <Link href={sp.company ? `/tasks/bulk?company=${sp.company}` : '/tasks/bulk'} className="text-brand-700 underline">
              أضف عدة مهام مرة واحدة
            </Link>{' '}
            أو{' '}
            <Link href="/templates" className="text-brand-700 underline">
              استخدم قالبًا
            </Link>
          </>
        }
      />
      {sp.added && (
        <div className="mb-4">
          <Alert kind="success">تمت إضافة المهمة. يمكنك إضافة مهمة أخرى لنفس الشركة.</Alert>
        </div>
      )}
      <Card className="max-w-3xl p-5">
        {companies.length === 0 ? (
          <div className="space-y-3 text-sm">
            <p>يجب إضافة شركة واحدة على الأقل قبل إضافة المهام.</p>
            <Link href="/companies/new" className={btn.primary}>
              إضافة شركة
            </Link>
          </div>
        ) : (
          <TaskForm
            companies={companies}
            team={team}
            assigneeIds={[user.id]}
            defaultCompanyId={sp.company}
            defaultDeadline={addDays(todayIn(org.timezone), 7)}
            orgReminderDays={org.reminder_days}
          />
        )}
      </Card>
    </>
  )
}
