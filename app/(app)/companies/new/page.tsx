import { CompanyForm } from '@/components/company-form'
import { SideTips } from '@/components/side-tips'
import { Card, Crumbs, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'

export const metadata = { title: 'شركة جديدة' }

export default async function NewCompanyPage() {
  await requireSession()
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
