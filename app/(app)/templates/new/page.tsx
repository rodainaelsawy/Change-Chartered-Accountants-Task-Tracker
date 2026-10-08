import Link from 'next/link'
import { TemplateForm } from '@/components/template-form'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'

export const metadata = { title: 'قالب جديد' }

export default async function NewTemplatePage() {
  await requireSession()
  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/templates" className="text-brand-700 hover:underline">
          قوالب المهام
        </Link>
      </div>
      <PageHeader title="قالب جديد" />
      <Card className="max-w-3xl p-5">
        <TemplateForm items={[]} />
      </Card>
    </>
  )
}
