import { ClientForm } from '@/components/client-form'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'

export const metadata = { title: 'عميل جديد' }

export default async function NewClientPage() {
  await requireSession()
  return (
    <>
      <PageHeader title="عميل جديد" />
      <Card className="max-w-3xl p-5">
        <ClientForm />
      </Card>
    </>
  )
}
