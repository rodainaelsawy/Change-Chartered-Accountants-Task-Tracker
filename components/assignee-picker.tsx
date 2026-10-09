import { RequiredMark } from './ui'

export type TeamMember = { id: string; full_name: string; active: boolean; role?: string }

/** Mandatory "المسؤولون" checkboxes (validated by ActionForm's checkGroups={[{ name: 'assignees', … }]}). */
export function AssigneePicker({
  team,
  selected,
  className = '',
}: {
  team: TeamMember[]
  selected: string[]
  className?: string
}) {
  // Inactive members are listed only if they are already assigned.
  const members = team.filter((m) => m.active || selected.includes(m.id))
  return (
    <fieldset data-group="assignees" className={`rounded-lg border border-slate-300 p-3 ${className}`}>
      <legend className="px-1 text-sm font-medium text-slate-700">
        المسؤولون
        <RequiredMark />
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="assignees" value={m.id} defaultChecked={selected.includes(m.id)} className="h-4 w-4" />
            <span className={m.active ? '' : 'text-slate-400 line-through'}>{m.full_name}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">تصل التذكيرات للمسؤولين فقط.</p>
    </fieldset>
  )
}

export const ASSIGNEES_CHECK = [{ name: 'assignees', message: 'اختر مسؤولًا واحدًا على الأقل' }]

/** Optional "المتابعون" checkboxes: who reviews and approves the task (Phase 3). */
export function FollowerPicker({
  team,
  selected,
  className = '',
}: {
  team: TeamMember[]
  selected: string[]
  className?: string
}) {
  const members = team.filter((m) => m.active || selected.includes(m.id))
  return (
    <fieldset className={`rounded-lg border border-slate-300 p-3 ${className}`}>
      <legend className="px-1 text-sm font-medium text-slate-700">المتابعون (للمراجعة والاعتماد)</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="followers" value={m.id} defaultChecked={selected.includes(m.id)} className="h-4 w-4" />
            <span className={m.active ? '' : 'text-slate-400 line-through'}>{m.full_name}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        اختياري. إذا اخترت متابعًا، فعند الإنجاز تصبح المهمة «جاهزة للمراجعة» ولا تُعتبر منجزة حتى يعتمدها المتابع.
      </p>
    </fieldset>
  )
}
