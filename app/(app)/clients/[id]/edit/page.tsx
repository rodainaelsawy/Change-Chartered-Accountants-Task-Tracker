import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/client-form'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one } from '@/lib/db'
import type { Client } from '@/lib/types'

export const metadata = { title: 'تعديل العميل' }

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const client = await one<Client>('select * from clients where id = $1 and org_id = $2', [id, org.id])
  if (!client) notFound()
  return (
    <>
      <PageHeader title={`تعديل: ${client.name}`} />
      <Card className="max-w-3xl p-5">
        <ClientForm client={client} />
      </Card>
    </>
  )
}
