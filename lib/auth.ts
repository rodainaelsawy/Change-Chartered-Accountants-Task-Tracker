import 'server-only'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { one, query } from './db'
import type { Org, User } from './types'

const COOKIE = 'tt_session'
const SESSION_DAYS = 30

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
export const newToken = () => crypto.randomBytes(32).toString('base64url')

export const hashPassword = (p: string) => bcrypt.hash(p, 10)
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash)

export async function createSession(userId: string) {
  const token = newToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), userId, expires])
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL ?? '').startsWith('https'),
    path: '/',
    expires,
  })
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (token) await query('delete from sessions where token_hash = $1', [sha256(token)])
  store.delete(COOKIE)
}

export type Session = { user: User; org: Org }

/** Current user + org, or null. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  const row = await one<User & { o: Org }>(
    `select u.id, u.org_id, u.email, u.full_name, u.role, u.email_digest, u.active,
            row_to_json(o.*) as o
       from sessions s
       join users u on u.id = s.user_id
       join organizations o on o.id = u.org_id
      where s.token_hash = $1 and s.expires_at > now() and u.active`,
    [sha256(token)],
  )
  if (!row) return null
  const { o, ...user } = row
  return { user, org: o }
})

export async function requireSession(): Promise<Session> {
  const s = await getSession()
  if (!s) redirect('/login')
  return s
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession()
  if (s.user.role !== 'admin') redirect('/')
  return s
}

// ---------- One-time tokens (password reset + invitations) ----------

export async function createPasswordToken(userId: string, days: number) {
  const token = newToken()
  await query('insert into password_tokens (token_hash, user_id, expires_at) values ($1, $2, $3)', [
    sha256(token),
    userId,
    new Date(Date.now() + days * 86_400_000),
  ])
  return token
}

export async function findPasswordToken(token: string) {
  return one<{ user_id: string; email: string; full_name: string; has_password: boolean }>(
    `select t.user_id, u.email, u.full_name, (u.password_hash is not null) as has_password
       from password_tokens t join users u on u.id = t.user_id
      where t.token_hash = $1 and t.used_at is null and t.expires_at > now() and u.active`,
    [sha256(token)],
  )
}

export async function consumePasswordToken(token: string) {
  await query('update password_tokens set used_at = now() where token_hash = $1', [sha256(token)])
}
