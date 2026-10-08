import { saveTask } from '@/app/actions/tasks'
import { FREQ_LABEL, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/labels'
import type { Task } from '@/lib/types'
import { ActionForm } from './action-form'
import { CompanyCombobox, DeadlineInput } from './form-inputs'
import { ASSIGNEES_CHECK, AssigneePicker, type TeamMember } from './assignee-picker'
import { Field, btn, inputCls } from './ui'


export function TaskForm({
  task,
  companies,
  team,
  assigneeIds,
  defaultCompanyId,
  defaultDeadline,
  orgReminderDays,
  next,
  today,
  cancelHref,
  actionsTarget,
}: {
  task?: Task
  companies: { id: string; name: string }[]
  team: TeamMember[]
  /** Selected assignees (for a new task: the current user). */
  assigneeIds: string[]
  defaultCompanyId?: string
  defaultDeadline: string
  orgReminderDays: number
  next?: string
  today: string
  cancelHref?: string
  /** Show save/cancel in this element (e.g. the page header) instead of under the form. */
  actionsTarget?: string
}) {
  const recurring = Boolean(task?.series_id)
  return (
    <ActionForm
      action={saveTask}
      submitLabel={task ? 'حفظ التعديلات' : 'إضافة المهمة'}
      className="grid gap-4 sm:grid-cols-2"
      checkGroups={ASSIGNEES_CHECK}
      cancelHref={cancelHref}
      id={actionsTarget ? 'task-form' : undefined}
      actionsTarget={actionsTarget}
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
        <CompanyCombobox name="company_id" required companies={companies} defaultValue={task?.company_id ?? defaultCompanyId} />
      </Field>
      <Field label={recurring ? 'موعد التسليم (لهذه المرة)' : 'موعد التسليم'}>
        <DeadlineInput name="deadline" required defaultValue={task?.deadline ?? defaultDeadline} today={today} />
      </Field>

      <AssigneePicker team={team} selected={assigneeIds} className="sm:col-span-2" />

      <Field label="الأولوية">
        <select name="priority" required defaultValue={task?.priority ?? 'medium'} className={inputCls}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="الحالة">
        <select name="status" required defaultValue={task?.status ?? 'not_started'} className={inputCls}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>

      {!recurring && (
        <Field
          label="التكرار"
          hint={
            task
              ? 'عند اختيار التكرار يصبح موعد هذه المهمة هو أول موعد، وتُنشأ المهمة التالية تلقائيًا.'
              : 'موعد التسليم أعلاه هو أول موعد. تُنشأ المهمة التالية تلقائيًا عند إنجاز الحالية أو حلول موعدها.'
          }
        >
          <select name="recurrence" defaultValue="" className={inputCls}>
            <option value="">بدون تكرار</option>
            {Object.entries(FREQ_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      )}
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
        <textarea name="description" rows={3} defaultValue={task?.description ?? ''} className={inputCls} />
      </Field>
      {!task && (
        <Field label="خطوات المهمة (اختياري)" hint="سطر لكل خطوة. يمكنك تعديلها لاحقًا من صفحة المهمة." className="sm:col-span-2">
          <textarea name="checklist" rows={3} placeholder={'جمع الفواتير\nمراجعة البيانات\nرفع الإقرار'} className={inputCls} />
        </Field>
      )}
    </ActionForm>
  )
}
