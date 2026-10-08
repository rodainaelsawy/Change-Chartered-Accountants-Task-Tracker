import { addDays, addMonthsClamped } from './dates'

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Report date range from the URL; defaults to the current month. */
export function reportRange(from: string | null | undefined, to: string | null | undefined, today: string) {
  const monthStart = today.slice(0, 8) + '01'
  const f = from && DATE.test(from) ? from : monthStart
  const t = to && DATE.test(to) ? to : addDays(addMonthsClamped(monthStart, 1), -1)
  return f <= t ? { from: f, to: t } : { from: t, to: f }
}

export function presets(today: string) {
  const monthStart = today.slice(0, 8) + '01'
  const prevStart = addMonthsClamped(monthStart, -1)
  const yearStart = today.slice(0, 4) + '-01-01'
  return [
    { label: 'هذا الشهر', from: monthStart, to: addDays(addMonthsClamped(monthStart, 1), -1) },
    { label: 'الشهر الماضي', from: prevStart, to: addDays(monthStart, -1) },
    { label: 'آخر 3 أشهر', from: addMonthsClamped(monthStart, -2), to: addDays(addMonthsClamped(monthStart, 1), -1) },
    { label: 'هذا العام', from: yearStart, to: today.slice(0, 4) + '-12-31' },
  ]
}
