import Link from 'next/link'
import { requireManager } from '@/lib/permissions'
import { TemplateForm } from '@/components/template-form'
import { SideTips } from '@/components/side-tips'
import { Crumbs, Card, PageHeader } from '@/components/ui'

export const metadata = { title: 'قالب جديد' }

export default async function NewTemplatePage() {
  await requireManager()
  return (
    <>
      <Crumbs items={[{ href: '/templates', label: 'قوالب المهام' }]} />
      <PageHeader title="قالب جديد" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <TemplateForm items={[]} cancelHref="/templates" />
        </Card>
        <SideTips
          items={[
            'مثال: قالب «تأسيس شركة جديدة» يضم: فتح ملف ضريبي (بعد 0 يوم)، التسجيل في القيمة المضافة (بعد 14 يومًا)، أول إقرار شهري (بعد 30 يومًا، شهريًا).',
            'عند التطبيق تختار الشركات وتاريخ البداية والمسؤولين، وتُنشأ كل المهام دفعة واحدة.',
            'تعديل القالب لاحقًا لا يغيّر المهام التي أُنشئت منه.',
          ]}
        />
      </div>
    </>
  )
}
