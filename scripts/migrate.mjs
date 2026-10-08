// Applies db/migrations/*.sql in order. Safe to run repeatedly.
// Usage: npm run db:migrate   (reads DATABASE_URL from .env / .env.local or the environment)
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { loadEnv } from './env.mjs'

loadEnv()
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

const dir = path.join(process.cwd(), 'db', 'migrations')

// Create the database if it does not exist yet (so no `createdb` / pgAdmin step is needed).
async function ensureDatabase() {
  const target = new URL(url)
  const dbName = decodeURIComponent(target.pathname.slice(1))
  const probe = new pg.Client({ connectionString: url })
  try {
    await probe.connect()
    await probe.end()
  } catch (e) {
    if (e.code !== '3D000') throw e // 3D000 = database does not exist
    const admin = new URL(url)
    admin.pathname = '/postgres'
    const c = new pg.Client({ connectionString: admin.toString() })
    await c.connect()
    await c.query(`create database "${dbName.replace(/"/g, '""')}"`)
    await c.end()
    console.log(`created database "${dbName}"`)
  }
}

try {
  await ensureDatabase()
} catch (e) {
  if (e.code === '28P01') console.error('Wrong Postgres user or password in DATABASE_URL (.env).')
  else if (e.code === 'ECONNREFUSED') console.error('Cannot reach Postgres. Is the PostgreSQL service running, and is the port in DATABASE_URL correct?')
  else console.error(e.message)
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  )
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name))
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  let applied = 0
  for (const f of files) {
    if (done.has(f)) continue
    const sql = fs.readFileSync(path.join(dir, f), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (name) values ($1)', [f])
      await client.query('commit')
      console.log('applied', f)
      applied++
    } catch (e) {
      await client.query('rollback')
      throw e
    }
  }
  console.log(applied ? `${applied} migration(s) applied.` : 'Database is up to date.')
} finally {
  await client.end()
}
