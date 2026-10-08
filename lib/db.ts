import 'server-only'
import pg from 'pg'

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (avoids time-zone shifts).
pg.types.setTypeParser(1082, (v) => v)

const globalForPg = globalThis as unknown as { pgPool?: pg.Pool }

export const pool =
  globalForPg.pgPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect()
  try {
    await c.query('begin')
    const r = await fn(c)
    await c.query('commit')
    return r
  } catch (e) {
    await c.query('rollback')
    throw e
  } finally {
    c.release()
  }
}
