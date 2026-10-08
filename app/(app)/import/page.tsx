import Link from 'next/link'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { ImportClients } from './import-clients'

export const metadata = { title: 'استيراد العملاء' }

export default async function ImportPage() {
  await requireSession()
  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/clients" className="text-brand-700 hover:underline">
          العملاء
        </Link>
      </div>
      <PageHeader title="استيراد العملاء" subtitle="من ملف Excel (‎.xlsx) أو CSV" />
      <Card className="p-5">
        <ImportClients />
      </Card>
    </>
  )
}
