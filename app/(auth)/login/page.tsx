import Link from 'next/link'
import { redirect } from 'next/navigation'
import { login } from '@/app/actions/auth'
import { ActionForm } from '@/components/action-form'
import { Field, btn, inputCls } from '@/components/ui'
import { getSession } from '@/lib/auth'
import { one } from '@/lib/db'

export const metadata = { title: 'تسجيل الدخول' }

export default async function LoginPage() {
  if (await getSession()) redirect('/')
  const { n } = (await one<{ n: number }>('select count(*)::int as n from users'))!
  if (n === 0) redirect('/setup')

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">تسجيل الدخول</h1>
      <ActionForm action={login} submitLabel="دخول" submitClassName={`${btn.primary} w-full`}>
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" required autoComplete="email" className={`${inputCls} ltr`} />
        </Field>
        <Field label="كلمة المرور">
          <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
        </Field>
      </ActionForm>
      <div className="mt-4 text-center text-sm">
        <Link href="/forgot" className="text-brand-700 hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </div>
    </>
  )
}
