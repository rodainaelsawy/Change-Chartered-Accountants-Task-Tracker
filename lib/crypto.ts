import 'server-only'
import crypto from 'node:crypto'

/*
 Encrypts secrets that must be shown again later (the tax-portal password), so they cannot be hashed.
 AES-256-GCM with a key derived from ENCRYPTION_KEY. Keep ENCRYPTION_KEY secret and never change it after
 data exists: values encrypted with an old key can no longer be read.
*/

const DEV_KEY = 'dev-only-insecure-key-do-not-use-in-production'
let warned = false

function key(): Buffer {
  let secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY is not set')
    if (!warned) console.warn('[crypto] ENCRYPTION_KEY is not set; using an insecure development key.')
    warned = true
    secret = DEV_KEY
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':')
}

export function decrypt(value: string): string | null {
  try {
    const [v, iv, tag, data] = value.split(':')
    if (v !== 'v1') return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
