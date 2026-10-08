'use server'

import { redirect } from 'next/navigation'
import { one, query, tx } from '@/lib/db'
import {
  consumePasswordToken,
  createPasswordToken,
  createSession,
  destroySession,
  findPasswordToken,
  hashPassword,
  verifyPassword,
} from '@/lib/auth'
import { appUrl, emailLayout, sendMail } from '@/lib/mail'

export type FormState = { error?: string; ok?: string } | undefined

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

function checkPassword(p: string): string | null {
  if (p.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
  return null
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase()
  const password = String(fd.get('password') ?? '')
  const u = await one<{ id: string; password_hash: string | null; active: boolean }>(
    'select id, password_hash, active from users where lower(email) = $1',
    [email],
  )
  if (!u || !u.password_hash || !u.active || !(await verifyPassword(password, u.password_hash))) {
    return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
  }
  await createSession(u.id)
  redirect('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}

/** First-run setup: only allowed while there are no users at all. Creates the organization and its admin. */
export async function setup(_: FormState, fd: FormData): Promise<FormState> {
  const orgName = str(fd, 'org_name')
  const fullName = str(fd, 'full_name')
  const email = str(fd, 'email').toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!orgName || !fullName || !email) return { error: 'جميع الحقول مطلوبة' }
  const pe = checkPassword(password)
  if (pe) return { error: pe }

  const hash = await hashPassword(password)
  const userId = await tx(async (c) => {
    await c.query('lock table users in exclusive mode')
    const { rows } = await c.query('select count(*)::int as n from users')
    if (rows[0].n > 0) return null
    const org = await c.query('insert into organizations (name) values ($1) returning id', [orgName])
    const u = await c.query(
      `insert into users (org_id, email, full_name, password_hash, role) values ($1, $2, $3, $4, 'admin') returning id`,
      [org.rows[0].id, email, fullName, hash],
    )
    return u.rows[0].id as string
  })
  if (!userId) redirect('/login')
  await createSession(userId)
  redirect('/')
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase()
  const u = await one<{ id: string; full_name: string }>(
    'select id, full_name from users where lower(email) = $1 and active',
    [email],
  )
  if (u) {
    const token = await createPasswordToken(u.id, 1)
    const link = appUrl(`/reset/${token}`)
    await sendMail(
      email,
      'إعادة تعيين كلمة المرور',
      emailLayout(
        'إعادة تعيين كلمة المرور',
        `<p>مرحبًا ${u.full_name}،</p><p>لإعادة تعيين كلمة المرور اضغط على الرابط التالي (صالح لمدة 24 ساعة):</p>
         <p><a href="${link}">${link}</a></p><p>إذا لم تطلب ذلك يمكنك تجاهل هذه الرسالة.</p>`,
      ),
    )
  }
  return { ok: 'إذا كان البريد مسجلًا لدينا فستصلك رسالة تحتوي على رابط إعادة التعيين.' }
}

/** Used both by password-reset links and invitation links. */
export async function setPasswordWithToken(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token')
  const password = String(fd.get('password') ?? '')
  const confirm = String(fd.get('confirm') ?? '')
  const t = await findPasswordToken(token)
  if (!t) return { error: 'الرابط غير صالح أو انتهت صلاحيته' }
  const pe = checkPassword(password)
  if (pe) return { error: pe }
  if (password !== confirm) return { error: 'كلمتا المرور غير متطابقتين' }
  const fullName = str(fd, 'full_name')
  await query(
    `update users set password_hash = $2, full_name = case when $3 <> '' then $3 else full_name end where id = $1`,
    [t.user_id, await hashPassword(password), fullName],
  )
  await consumePasswordToken(token)
  await query('delete from sessions where user_id = $1', [t.user_id])
  await createSession(t.user_id)
  redirect('/')
}
