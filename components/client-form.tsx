import { saveClient } from '@/app/actions/clients'
import type { Client } from '@/lib/types'
import { ActionForm } from './action-form'
import { Field, inputCls } from './ui'

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={saveClient} submitLabel={client ? 'حفظ التعديلات' : 'إضافة العميل'} className="grid gap-4 sm:grid-cols-2">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Field label="اسم العميل">
        <input name="name" required defaultValue={client?.name} className={inputCls} autoFocus={!client} />
      </Field>
      <Field label="الشركة / النشاط">
        <input name="company" defaultValue={client?.company ?? ''} className={inputCls} />
      </Field>
      <Field label="الشخص المسؤول">
        <input name="contact_person" defaultValue={client?.contact_person ?? ''} className={inputCls} />
      </Field>
      <Field label="الهاتف">
        <input name="phone" type="tel" defaultValue={client?.phone ?? ''} className={`${inputCls} ltr text-right`} />
      </Field>
      <Field label="البريد الإلكتروني" className="sm:col-span-2">
        <input name="email" type="email" defaultValue={client?.email ?? ''} className={`${inputCls} ltr text-right`} />
      </Field>
      <Field label="ملاحظات" className="sm:col-span-2">
        <textarea name="notes" rows={3} defaultValue={client?.notes ?? ''} className={inputCls} />
      </Field>
    </ActionForm>
  )
}
