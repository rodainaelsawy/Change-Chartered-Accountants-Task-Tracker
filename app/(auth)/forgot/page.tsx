import Link from 'next/link'
import { requestPasswordReset } from '@/app/actions/auth'
import { ActionForm } from '@/components/action-form'
import { Field, btn, inputCls } from '@/components/ui'

export const metadata = { title: 'نسيت كلمة المرور' }

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-xl font-bold">نسيت كلمة المرور</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
      <ActionForm action={requestPasswordReset} submitLabel="إرسال الرابط" submitClassName={`${btn.primary} w-full`}>
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" required className={`${inputCls} ltr`} />
        </Field>
      </ActionForm>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </div>
    </>
  )
}
