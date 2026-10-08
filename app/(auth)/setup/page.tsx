import { redirect } from 'next/navigation'
import { setup } from '@/app/actions/auth'
import { ActionForm } from '@/components/action-form'
import { Field, btn, inputCls } from '@/components/ui'
import { one } from '@/lib/db'

export const metadata = { title: 'الإعداد الأول' }
export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const { n } = (await one<{ n: number }>('select count(*)::int as n from users'))!
  if (n > 0) redirect('/login')

  return (
    <>
      <h1 className="text-xl font-bold">الإعداد الأول</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">أنشئ حساب المؤسسة وحساب المدير. يمكنك إضافة باقي أعضاء الفريق لاحقًا.</p>
      <ActionForm action={setup} submitLabel="إنشاء الحساب" submitClassName={`${btn.primary} w-full`}>
        <Field label="اسم المؤسسة">
          <input name="org_name" required className={inputCls} />
        </Field>
        <Field label="اسمك">
          <input name="full_name" required autoComplete="name" className={inputCls} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" required autoComplete="email" className={`${inputCls} ltr`} />
        </Field>
        <Field label="كلمة المرور" hint="8 أحرف على الأقل">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </Field>
      </ActionForm>
    </>
  )
}
