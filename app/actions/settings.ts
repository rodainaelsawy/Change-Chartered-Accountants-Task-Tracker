'use server'

import type { UserRole } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { createPasswordToken, hashPassword, requireAdmin, requireSession, verifyPassword } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { appUrl, emailLayout, escapeHtml, mailEnabled, sendMail } from '@/lib/mail'
import { syncNotifications } from '@/lib/reminders'
import type { FormState } from './auth'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireSession()
  const fullName = str(fd, 'full_name')
  if (!fullName) return { error: 'الاسم مطلوب' }
  await query('update users set full_name = $2, email_digest = $3 where id = $1', [
    user.id,
    fullName,
    fd.get('email_digest') === 'on',
  ])
  revalidatePath('/', 'layout')
  return { ok: 'تم حفظ البيانات' }
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireSession()
  const current = String(fd.get('current') ?? '')
  const next = String(fd.get('password') ?? '')
  const row = await one<{ password_hash: string }>('select password_hash from users where id = $1', [user.id])
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: 'كلمة المرور الحالية غير صحيحة' }
  if (next.length < 8) return { error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }
  if (next !== String(fd.get('confirm') ?? '')) return { error: 'كلمتا المرور غير متطابقتين' }
  await query('update users set password_hash = $2 where id = $1', [user.id, await hashPassword(next)])
  return { ok: 'تم تغيير كلمة المرور' }
}

export async function updateOrg(_: FormState, fd: FormData): Promise<FormState> {
  const { org } = await requireAdmin()
  const name = str(fd, 'name')
  const days = Number(fd.get('reminder_days'))
  if (!name) return { error: 'اسم المؤسسة مطلوب' }
  if (!Number.isInteger(days) || days < 0 || days > 60) return { error: 'عدد أيام التذكير يجب أن يكون بين 0 و 60' }
  await query('update organizations set name = $2, reminder_days = $3 where id = $1', [org.id, name, days])
  await syncNotifications({ ...org, reminder_days: days })
  revalidatePath('/', 'layout')
  return { ok: 'تم حفظ إعدادات المؤسسة' }
}

async function sendInvite(userId: string, email: string, fullName: string, orgName: string, inviter: string) {
  const token = await createPasswordToken(userId, 7)
  const link = appUrl(`/reset/${token}`)
  await sendMail(
    email,
    `دعوة للانضمام إلى ${orgName}`,
    emailLayout(
      'دعوة للانضمام إلى الفريق',
      `<p>مرحبًا ${escapeHtml(fullName)}،</p><p>قام ${escapeHtml(inviter)} بإضافتك إلى نظام متابعة المهام في ${escapeHtml(orgName)}.</p>
       <p>لتعيين كلمة المرور والدخول اضغط على الرابط التالي (صالح لمدة 7 أيام):</p><p><a href="${link}">${link}</a></p>`,
    ),
  )
  return link
}

export async function inviteUser(_: FormState, fd: FormData): Promise<FormState> {
  const { user, org } = await requireAdmin()
  const email = str(fd, 'email').toLowerCase()
  const fullName = str(fd, 'full_name')
  if (!email || !fullName) return { error: 'الاسم والبريد الإلكتروني مطلوبان' }
  const exists = await one('select 1 from users where lower(email) = $1', [email])
  if (exists) return { error: 'يوجد مستخدم بهذا البريد بالفعل' }
  const u = (await one<{ id: string }>(
    `insert into users (org_id, email, full_name, role) values ($1, $2, $3, $4) returning id`,
    [org.id, email, fullName, ROLES.includes(fd.get('role') as UserRole) ? fd.get('role') : 'staff'],
  ))!
  const link = await sendInvite(u.id, email, fullName, org.name, user.full_name)
  revalidatePath('/settings')
  return {
    ok: mailEnabled()
      ? `تمت إضافة ${fullName} وإرسال الدعوة إلى بريده. يمكنك أيضًا مشاركة الرابط: ${link}`
      : `تمت إضافة ${fullName}. أرسل له رابط الدعوة التالي (صالح 7 أيام): ${link}`,
  }
}

export async function resendInvite(userId: string): Promise<FormState> {
  const { user, org } = await requireAdmin()
  const u = await one<{ email: string; full_name: string }>(
    'select email, full_name from users where id = $1 and org_id = $2',
    [userId, org.id],
  )
  if (!u) return { error: 'المستخدم غير موجود' }
  const link = await sendInvite(userId, u.email, u.full_name, org.name, user.full_name)
  return { ok: link }
}

export async function setUserActive(userId: string, active: boolean) {
  const { user, org } = await requireAdmin()
  if (userId === user.id) return
  await query('update users set active = $3 where id = $1 and org_id = $2', [userId, org.id, active])
  if (!active) await query('delete from sessions where user_id = $1', [userId])
  revalidatePath('/settings')
}

const ROLES: UserRole[] = ['admin', 'member', 'staff']

export async function setUserRole(userId: string, role: UserRole) {
  const { user, org } = await requireAdmin()
  if (userId === user.id || !ROLES.includes(role)) return
  await query('update users set role = $3 where id = $1 and org_id = $2', [userId, org.id, role])
  revalidatePath('/settings')
}
