import Link from 'next/link'
import { TaskForm } from '@/components/task-form'
import { Alert, Card, PageHeader, btn } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { addDays, todayIn } from '@/lib/dates'
import { clientOptions } from '@/lib/queries'

export const metadata = { title: 'مهمة جديدة' }

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; added?: string }>
}) {
  const { org } = await requireSession()
  const sp = await searchParams
  const clients = await clientOptions(org.id)

  return (
    <>
      <PageHeader title="مهمة جديدة" />
      {sp.added && (
        <div className="mb-4">
          <Alert kind="success">تمت إضافة المهمة. يمكنك إضافة مهمة أخرى لنفس العميل.</Alert>
        </div>
      )}
      <Card className="max-w-3xl p-5">
        {clients.length === 0 ? (
          <div className="space-y-3 text-sm">
            <p>يجب إضافة عميل واحد على الأقل قبل إضافة المهام.</p>
            <Link href="/clients/new" className={btn.primary}>
              إضافة عميل
            </Link>
          </div>
        ) : (
          <TaskForm
            clients={clients}
            defaultClientId={sp.client}
            defaultDeadline={addDays(todayIn(org.timezone), 7)}
            orgReminderDays={org.reminder_days}
          />
        )}
      </Card>
    </>
  )
}
