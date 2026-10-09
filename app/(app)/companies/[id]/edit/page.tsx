import { notFound } from 'next/navigation'
import { requireManager } from '@/lib/permissions'
import { CompanyForm } from '@/components/company-form'
import { SideTips } from '@/components/side-tips'
import { Crumbs, Card, PageHeader } from '@/components/ui'
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
  const { org } = await requireManager()
  const { id } = await params
  const { tab } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const company = await one<Company>('select * from companies where id = $1 and org_id = $2', [id, org.id])
  if (!company) notFound()
  return (
    <>
      <Crumbs items={[{ href: '/companies', label: 'الشركات' }, { href: `/companies/${id}`, label: company.name }]} />
      <PageHeader title="تعديل بيانات الشركة" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <CompanyForm company={company} focusTax={tab === 'tax'} cancelHref={`/companies/${id}`} />
        </Card>
        <SideTips
          items={[
            'الحقول الإلزامية: اسم الشركة، الشخص المسؤول، والهاتف أو البريد الإلكتروني.',
            'اترك كلمة مرور المنظومة الضريبية فارغة للإبقاء على المحفوظة.',
            'المرفقات (السجل التجاري، البطاقة الضريبية، ملفات أخرى) تُدار من صفحة الشركة.',
          ]}
          links={[{ href: `/companies/${id}`, label: 'العودة لصفحة الشركة' }]}
        />
      </div>
    </>
  )
}
