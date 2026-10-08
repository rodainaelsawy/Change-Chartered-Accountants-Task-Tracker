import { CompanyForm } from '@/components/company-form'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'

export const metadata = { title: 'شركة جديدة' }

export default async function NewCompanyPage() {
  await requireSession()
  return (
    <>
      <PageHeader title="شركة جديدة" subtitle="يمكنك إضافة المرفقات بعد حفظ الشركة." />
      <Card className="max-w-3xl p-5">
        <CompanyForm />
      </Card>
    </>
  )
}
