import Link from 'next/link'
import { setPasswordWithToken } from '@/app/actions/auth'
import { ActionForm } from '@/components/action-form'
import { Alert, Field, btn, inputCls } from '@/components/ui'
import { findPasswordToken } from '@/lib/auth'

export const metadata = { title: 'تعيين كلمة المرور' }

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const t = await findPasswordToken(token)
  if (!t) {
    return (
      <div className="space-y-4">
        <Alert>الرابط غير صالح أو انتهت صلاحيته.</Alert>
        <Link href="/forgot" className="text-sm text-brand-700 hover:underline">
          طلب رابط جديد
        </Link>
      </div>
    )
  }
  const invite = !t.has_password
  return (
    <>
      <h1 className="text-xl font-bold">{invite ? 'مرحبًا بك في الفريق' : 'تعيين كلمة مرور جديدة'}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500 ltr text-right">{t.email}</p>
      <ActionForm action={setPasswordWithToken} submitLabel="حفظ والدخول" submitClassName={`${btn.primary} w-full`}>
        <input type="hidden" name="token" value={token} />
        {invite && (
          <Field label="اسمك">
            <input name="full_name" defaultValue={t.full_name} required className={inputCls} />
          </Field>
        )}
        <Field label="كلمة المرور" hint="8 أحرف على الأقل">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </Field>
        <Field label="تأكيد كلمة المرور">
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        </Field>
      </ActionForm>
    </>
  )
}
