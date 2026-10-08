// All deadlines are calendar dates ('YYYY-MM-DD'). "Today" is computed in the organization's time zone.

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000)
}

/** Monday-based start of the week is not used in Egypt; weeks start on Saturday. */
export function startOfWeek(date: string): string {
  const day = new Date(date + 'T00:00:00Z').getUTCDay() // 0 Sun … 6 Sat
  return addDays(date, -((day + 1) % 7))
}

const longFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekdayFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', timeZone: 'UTC' })

export function formatDate(date: string, style: 'long' | 'short' = 'long'): string {
  const d = new Date(date + 'T00:00:00Z')
  return (style === 'long' ? longFmt : shortFmt).format(d)
}

export function formatWeekday(date: string): string {
  return weekdayFmt.format(new Date(date + 'T00:00:00Z'))
}

export function formatDateTime(d: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(d))
}

/** Human Arabic phrase for how far a deadline is from today. */
export function relativeDue(deadline: string, today: string): string {
  const n = daysBetween(today, deadline)
  if (n === 0) return 'اليوم'
  if (n === 1) return 'غدًا'
  if (n === 2) return 'بعد يومين'
  if (n === -1) return 'متأخرة يومًا'
  if (n === -2) return 'متأخرة يومين'
  if (n < 0) return `متأخرة ${-n} ${-n <= 10 ? 'أيام' : 'يومًا'}`
  return `بعد ${n} ${n <= 10 ? 'أيام' : 'يومًا'}`
}

/** Adds `months` calendar months to an anchor date, keeping the anchor's day (or the month's last day if shorter). */
export function addMonthsClamped(anchor: string, months: number): string {
  const [y, m, d] = anchor.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}
