import Link from 'next/link'
import { requireManager } from '@/lib/permissions'
import { Crumbs, Card, PageHeader } from '@/components/ui'
import { ImportCompanies } from './import-companies'

export const metadata = { title: 'استيراد الشركات' }

export default async function ImportPage() {
  await requireManager()
  return (
    <>
      <Crumbs items={[{ href: '/companies', label: 'الشركات' }]} />
      <PageHeader title="استيراد الشركات" subtitle="من ملف Excel (‎.xlsx) أو CSV" />
      <Card className="p-5">
        <ImportCompanies />
      </Card>
    </>
  )
}
