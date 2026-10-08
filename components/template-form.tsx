import { saveTemplate } from '@/app/actions/templates'
import { ActionForm } from './action-form'
import { TemplateItemsEditor, type TemplateItem } from './rows-editor'
import { Field, inputCls } from './ui'

export function TemplateForm({
  template,
  items,
}: {
  template?: { id: string; name: string; description: string | null }
  items: TemplateItem[]
}) {
  return (
    <ActionForm action={saveTemplate} submitLabel={template ? 'حفظ القالب' : 'إنشاء القالب'}>
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم القالب">
          <input name="name" required defaultValue={template?.name} placeholder="مثال: الإقرارات الشهرية" className={inputCls} />
        </Field>
        <Field label="وصف (اختياري)">
          <input name="description" defaultValue={template?.description ?? ''} className={inputCls} />
        </Field>
      </div>
      <p className="text-sm text-slate-600">
        موعد كل مهمة = تاريخ البداية الذي تختاره عند التطبيق + عدد الأيام. مثال: «بعد 14 يومًا» من 1 نوفمبر = 15 نوفمبر.
      </p>
      <TemplateItemsEditor initial={items} />
    </ActionForm>
  )
}
