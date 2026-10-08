// Triggers the daily reminder run on a running app server.
// Schedule it once a day (e.g. 07:00) with cron / Windows Task Scheduler, or let the hosting platform call
// GET {APP_URL}/api/cron/reminders?key={CRON_SECRET}.
// The app also runs it automatically on the first page load of the day, so this is a backup that
// guarantees the morning email digest goes out even if nobody opens the app.
import { loadEnv } from './env.mjs'

loadEnv()
const base = process.env.APP_URL || 'http://localhost:3000'
const key = process.env.CRON_SECRET || ''
const res = await fetch(`${base}/api/cron/reminders?key=${encodeURIComponent(key)}`)
console.log(res.status, await res.text())
if (!res.ok) process.exit(1)
