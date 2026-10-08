import { saveTask } from '@/app/actions/tasks'
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/labels'
import type { Task } from '@/lib/types'
import { ActionForm } from './action-form'
import { Field, btn, inputCls } from './ui'

export function TaskForm({
  task,
  companies,
  defaultCompanyId,
  defaultDeadline,
  orgReminderDays,
  next,
}: {
  task?: Task
  companies: { id: string; name: string }[]
  defaultCompanyId?: string
  defaultDeadline: string
  orgReminderDays: number
  next?: string
}) {
  return (
    <ActionForm
      action={saveTask}
      submitLabel={task ? 'حفظ التعديلات' : 'إضافة المهمة'}
      className="grid gap-4 sm:grid-cols-2"
      footer={
        !task && (
          <button type="submit" name="again" value="1" className={btn.secondary}>
            إضافة ومهمة أخرى لنفس الشركة
          </button>
        )
      }
    >
      {task && <input type="hidden" name="id" value={task.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="عنوان المهمة" className="sm:col-span-2">
        <input name="title" required defaultValue={task?.title} className={inputCls} autoFocus={!task} />
      </Field>
      <Field label="الشركة">
        <select name="company_id" required defaultValue={task?.company_id ?? defaultCompanyId ?? ''} className={inputCls}>
          <option value="" disabled>
            اختر الشركة…
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="موعد التسليم">
        <input name="deadline" type="date" required defaultValue={task?.deadline ?? defaultDeadline} className={inputCls} />
      </Field>
      <Field label="الأولوية">
        <select name="priority" defaultValue={task?.priority ?? 'medium'} className={inputCls}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="الحالة">
        <select name="status" defaultValue={task?.status ?? 'not_started'} className={inputCls}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="التذكير قبل الموعد (أيام)"
        hint={`اتركه فارغًا لاستخدام الإعداد الافتراضي (${orgReminderDays} ${orgReminderDays === 2 ? 'يومان' : 'أيام'})`}
      >
        <input
          name="reminder_days"
          type="number"
          min={0}
          max={60}
          defaultValue={task?.reminder_days ?? ''}
          placeholder={String(orgReminderDays)}
          className={`${inputCls} w-32`}
        />
      </Field>
      <Field label="الوصف / ملاحظات" className="sm:col-span-2">
        <textarea name="description" rows={4} defaultValue={task?.description ?? ''} className={inputCls} />
      </Field>
    </ActionForm>
  )
}
