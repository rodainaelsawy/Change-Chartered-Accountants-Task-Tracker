import { changePassword, inviteUser, setUserActive, setUserRole, updateOrg, updateProfile } from '@/app/actions/settings'
import { ActionForm } from '@/components/action-form'
import { Card, Field, PageHeader, btn, inputCls } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { InviteLinkButton } from './invite-link-button'

export const metadata = { title: 'الإعدادات' }

type Member = { id: string; email: string; full_name: string; role: 'admin' | 'member'; active: boolean; pending: boolean }

export default async function SettingsPage() {
  const { user, org } = await requireSession()
  const isAdmin = user.role === 'admin'
  const members = isAdmin
    ? await query<Member>(
        `select id, email, full_name, role, active, (password_hash is null) as pending
           from users where org_id = $1 order by active desc, full_name`,
        [org.id],
      )
    : []

  return (
    <>
      <PageHeader title="الإعدادات" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">بياناتي</h2>
          <ActionForm action={updateProfile} submitLabel="حفظ">
            <Field label="الاسم">
              <input name="full_name" defaultValue={user.full_name} required className={inputCls} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input value={user.email} disabled className={`${inputCls} ltr`} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="email_digest" defaultChecked={user.email_digest} className="h-4 w-4" />
              استلام ملخص المهام اليومي بالبريد الإلكتروني
            </label>
          </ActionForm>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">تغيير كلمة المرور</h2>
          <ActionForm action={changePassword} submitLabel="تغيير" resetOnSuccess>
            <Field label="كلمة المرور الحالية">
              <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل">
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="تأكيد كلمة المرور الجديدة">
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
          </ActionForm>
        </Card>

        {isAdmin && (
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">إعدادات المؤسسة</h2>
            <ActionForm action={updateOrg} submitLabel="حفظ">
              <Field label="اسم المؤسسة">
                <input name="name" defaultValue={org.name} required className={inputCls} />
              </Field>
              <Field label="التذكير الافتراضي قبل موعد التسليم (بالأيام)" hint="يمكن تغييره لكل مهمة على حدة">
                <input
                  name="reminder_days"
                  type="number"
                  min={0}
                  max={60}
                  defaultValue={org.reminder_days}
                  required
                  className={`${inputCls} w-32`}
                />
              </Field>
            </ActionForm>
          </Card>
        )}

        {isAdmin && (
          <Card className="p-5">
            <h2 className="mb-1 font-semibold">إضافة عضو للفريق</h2>
            <p className="mb-4 text-sm text-slate-500">يحصل العضو على رابط دعوة لتعيين كلمة المرور.</p>
            <ActionForm action={inviteUser} submitLabel="إضافة" resetOnSuccess>
              <Field label="الاسم">
                <input name="full_name" required className={inputCls} />
              </Field>
              <Field label="البريد الإلكتروني">
                <input name="email" type="email" required className={`${inputCls} ltr`} />
              </Field>
              <Field label="الصلاحية">
                <select name="role" required className={inputCls} defaultValue="member">
                  <option value="member">عضو</option>
                  <option value="admin">مدير (يدير الفريق والإعدادات)</option>
                </select>
              </Field>
            </ActionForm>
          </Card>
        )}
      </div>

      {isAdmin && (
        <Card className="mt-6 overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold">أعضاء الفريق ({members.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">الاسم</th>
                  <th className="px-5 py-2 font-medium">البريد</th>
                  <th className="px-5 py-2 font-medium">الصلاحية</th>
                  <th className="px-5 py-2 font-medium">الحالة</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className={m.active ? '' : 'text-slate-400'}>
                    <td className="px-5 py-3 font-medium">{m.full_name}</td>
                    <td className="px-5 py-3 ltr text-right">{m.email}</td>
                    <td className="px-5 py-3">{m.role === 'admin' ? 'مدير' : 'عضو'}</td>
                    <td className="px-5 py-3">
                      {!m.active ? 'موقوف' : m.pending ? <span className="text-amber-700">بانتظار قبول الدعوة</span> : 'نشط'}
                    </td>
                    <td className="px-5 py-3">
                      {m.id !== user.id && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {m.pending && m.active && <InviteLinkButton userId={m.id} />}
                          <form action={setUserRole.bind(null, m.id, m.role === 'admin' ? 'member' : 'admin')}>
                            <button className={btn.ghost}>{m.role === 'admin' ? 'جعله عضوًا' : 'جعله مديرًا'}</button>
                          </form>
                          <form action={setUserActive.bind(null, m.id, !m.active)}>
                            <button className={`${btn.ghost} ${m.active ? 'text-red-700' : ''}`}>
                              {m.active ? 'إيقاف' : 'تفعيل'}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
