import Link from 'next/link'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { ImportCompanies } from './import-companies'

export const metadata = { title: 'استيراد الشركات' }

export default async function ImportPage() {
  await requireSession()
  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/companies" className="text-brand-700 hover:underline">
          الشركات
        </Link>
      </div>
      <PageHeader title="استيراد الشركات" subtitle="من ملف Excel (‎.xlsx) أو CSV" />
      <Card className="p-5">
        <ImportCompanies />
      </Card>
    </>
  )
}
