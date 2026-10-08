import { query } from '@/lib/db'
import { runDaily } from '@/lib/reminders'
import type { Org } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 Daily reminder job: GET /api/cron/reminders?key=CRON_SECRET  (or header "Authorization: Bearer CRON_SECRET").
 Creates today's in-app reminders and sends the morning digest email, once per day per organization.
 Add &force=1 to re-send today's digest (useful for testing).
*/
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = process.env.CRON_SECRET
  const given = url.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || given !== secret) return new Response('unauthorized', { status: 401 })

  const orgs = await query<Org>('select * from organizations')
  const ran: string[] = []
  for (const org of orgs) {
    if (await runDaily(org, { force: url.searchParams.get('force') === '1' })) ran.push(org.name)
  }
  return Response.json({ ok: true, ran })
}
