import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CompanyForm } from '@/components/company-form'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { one } from '@/lib/db'
import type { Company } from '@/lib/types'

export const metadata = { title: 'تعديل الشركة' }

export default async function EditCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { org } = await requireSession()
  const { id } = await params
  const { tab } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const company = await one<Company>('select * from companies where id = $1 and org_id = $2', [id, org.id])
  if (!company) notFound()
  return (
    <>
      <div className="mb-2 text-sm">
        <Link href={`/companies/${id}`} className="text-brand-700 hover:underline">
          {company.name}
        </Link>
      </div>
      <PageHeader title="تعديل بيانات الشركة" />
      <Card className="max-w-3xl p-5">
        <CompanyForm company={company} focusTax={tab === 'tax'} />
      </Card>
    </>
  )
}
