import 'server-only'
import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!process.env.SMTP_HOST) return null
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  })
  return transporter
}

export const mailEnabled = () => Boolean(process.env.SMTP_HOST)

export function appUrl(path = '') {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '') + path
}

/** Sends an email. Without SMTP settings (development) the email is printed to the server console. */
export async function sendMail(to: string, subject: string, html: string) {
  const t = getTransporter()
  if (!t) {
    console.log(`\n[email] to: ${to}\n[email] subject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}\n`)
    return
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html })
  } catch (e) {
    console.error('[email] failed to send to', to, e)
  }
}

/** Wraps content in a simple right-to-left Arabic email layout. */
export function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
<h1 style="font-size:18px;margin:0 0 16px">${title}</h1>${body}
</div><p style="font-size:12px;color:#64748b;text-align:center">متابعة المهام</p></div></body></html>`
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
