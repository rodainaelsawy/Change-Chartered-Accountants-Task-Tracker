import { saveCompany } from '@/app/actions/companies'
import type { Company } from '@/lib/types'
import { ActionForm } from './action-form'
import { Field, inputCls } from './ui'

export function CompanyForm({ company, focusTax = false }: { company?: Company; focusTax?: boolean }) {
  const hasPassword = Boolean(company?.tax_password_enc)
  return (
    <ActionForm
      action={saveCompany}
      submitLabel={company ? 'حفظ التعديلات' : 'إضافة الشركة'}
      className="space-y-6"
      oneOf={[{ fields: ['phone', 'email'], message: 'أدخل رقم الهاتف أو البريد الإلكتروني (واحد على الأقل)' }]}
    >
      {company && <input type="hidden" name="id" value={company.id} />}
      {focusTax && <input type="hidden" name="tab" value="tax" />}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold text-slate-800">البيانات العامة</legend>
        <Field label="اسم الشركة">
          <input name="name" required defaultValue={company?.name} className={inputCls} autoFocus={!company} />
        </Field>
        <Field label="النشاط">
          <input name="activity" defaultValue={company?.activity ?? ''} className={inputCls} />
        </Field>
        <Field label="الشخص المسؤول">
          <input name="contact_person" required defaultValue={company?.contact_person ?? ''} className={inputCls} />
        </Field>
        <Field label="الهاتف" required="group">
          <input name="phone" type="tel" defaultValue={company?.phone ?? ''} className={`${inputCls} ltr text-right`} />
        </Field>
        <Field label="البريد الإلكتروني" required="group" className="sm:col-span-2">
          <input name="email" type="email" defaultValue={company?.email ?? ''} className={`${inputCls} ltr text-right`} />
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2">
          <textarea name="notes" rows={3} defaultValue={company?.notes ?? ''} className={inputCls} />
        </Field>
      </fieldset>

      <fieldset id="tax" className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold text-slate-800">البيانات الضريبية</legend>
        <Field label="البريد الإلكتروني (المنظومة الضريبية)" className="sm:col-span-2">
          <input
            name="tax_email"
            type="email"
            defaultValue={company?.tax_email ?? ''}
            autoComplete="off"
            className={`${inputCls} ltr text-right`}
            autoFocus={focusTax}
          />
        </Field>
        <Field label="اسم المستخدم">
          <input
            name="tax_username"
            defaultValue={company?.tax_username ?? ''}
            autoComplete="off"
            className={`${inputCls} ltr text-right`}
          />
        </Field>
        <Field
          label="كلمة المرور"
          hint={hasPassword ? 'كلمة المرور محفوظة. اتركها فارغة للإبقاء عليها، أو اكتب كلمة جديدة لتغييرها.' : 'تُحفظ مشفّرة.'}
        >
          <input
            name="tax_password"
            type="password"
            autoComplete="new-password"
            placeholder={hasPassword ? '••••••••' : ''}
            className={`${inputCls} ltr text-right`}
          />
        </Field>
        {hasPassword && (
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input type="checkbox" name="tax_password_clear" className="h-4 w-4" />
            حذف كلمة المرور المحفوظة
          </label>
        )}
      </fieldset>
    </ActionForm>
  )
}
