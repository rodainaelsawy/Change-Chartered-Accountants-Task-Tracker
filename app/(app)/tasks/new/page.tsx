import Link from 'next/link'
import { TaskForm } from '@/components/task-form'
import { SideTips, kbd } from '@/components/side-tips'
import { Alert, Card, Crumbs, PageHeader, btn } from '@/components/ui'
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
      <Crumbs items={[{ href: '/tasks', label: 'المهام' }]} />
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
      <div className="grid gap-6 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2">
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
            today={todayIn(org.timezone)}
            cancelHref={sp.company ? `/companies/${sp.company}` : '/tasks'}
          />
        )}
      </Card>
      <SideTips
        items={[
          'المسؤولون فقط يصلهم تذكير قبل الموعد ورسالة الملخص اليومي.',
          'التكرار: اختر «شهريًا» مثلًا وستُنشأ المهمة التالية تلقائيًا عند إنجاز الحالية أو حلول موعدها.',
          'خطوات المهمة اختيارية: سطر لكل خطوة، ويظهر التقدم (مثل 2/3) في قائمة المهام.',
          <>اختصار: اضغط {kbd('N')} من أي صفحة لإنشاء مهمة جديدة.</>,
        ]}
        links={[
          { href: sp.company ? `/tasks/bulk?company=${sp.company}` : '/tasks/bulk', label: 'إضافة عدة مهام مرة واحدة' },
          { href: '/templates', label: 'استخدام قالب مهام' },
        ]}
      />
      </div>
    </>
  )
}
