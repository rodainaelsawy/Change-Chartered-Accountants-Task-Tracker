import { CompanyForm } from '@/components/company-form'
import { requireManager } from '@/lib/permissions'
import { SideTips } from '@/components/side-tips'
import { Card, Crumbs, PageHeader } from '@/components/ui'

export const metadata = { title: 'شركة جديدة' }

export default async function NewCompanyPage() {
  await requireManager()
  return (
    <>
      <Crumbs items={[{ href: '/companies', label: 'الشركات' }]} />
      <PageHeader title="شركة جديدة" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <CompanyForm cancelHref="/companies" />
        </Card>
        <SideTips
          items={[
            'الحقول الإلزامية: اسم الشركة، الشخص المسؤول، والهاتف أو البريد الإلكتروني (واحد على الأقل).',
            'البيانات الضريبية اختيارية ويمكن إضافتها لاحقًا. كلمة المرور تُحفظ مشفّرة.',
            'بعد الحفظ يمكنك رفع السجل التجاري والبطاقة الضريبية وملفات PDF أخرى من صفحة الشركة.',
          ]}
          links={[{ href: '/import', label: 'لديك قائمة شركات؟ استوردها من Excel' }]}
        />
      </div>
    </>
  )
}
