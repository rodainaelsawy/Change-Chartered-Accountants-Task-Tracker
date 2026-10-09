import { formatDate } from '@/lib/dates'
import { tasksCount } from '@/lib/labels'

/**
 Single-series column chart: tasks completed per week (weeks start on Saturday).
 Server-rendered HTML; each column has a hover/focus tooltip, the current week is labelled directly,
 and a screen-reader table carries the same numbers.
*/
export function WeeklyChart({ weeks }: { weeks: { start: string; n: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.n))
  const total = weeks.reduce((a, w) => a + w.n, 0)
  const last = weeks.length - 1
  return (
    <figure className="min-w-0">
      <div className="flex h-40 items-end gap-2 border-b border-slate-300 px-1" dir="ltr" aria-hidden="true">
        {weeks.map((w, i) => (
          <div key={w.start} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none">
            {i === last && <span className="mb-1 text-xs font-semibold tabular-nums text-slate-700">{w.n}</span>}
            <div
              className={`w-full max-w-8 rounded-t-[4px] transition-colors ${i === last ? 'bg-brand-700' : 'bg-brand-300 group-hover:bg-brand-500 group-focus:bg-brand-500'}`}
              style={{ height: `${Math.max(w.n ? 4 : 0, (w.n / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block" dir="rtl">
              أسبوع {formatDate(w.start, 'short')}: <b className="tabular-nums">{w.n}</b>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 px-1 text-[11px] text-slate-400" dir="ltr" aria-hidden="true">
        {weeks.map((w, i) => (
          <span key={w.start} className="min-w-0 flex-1 truncate text-center" title={formatDate(w.start, 'short')}>
            {Number(w.start.slice(8))}/{Number(w.start.slice(5, 7))}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-slate-500">
        {tasksCount(total)} أُنجزت خلال آخر {weeks.length} أسابيع · العمود الداكن = هذا الأسبوع · كل عمود يبدأ يوم السبت
      </figcaption>
      <table className="sr-only">
        <caption>المهام المنجزة أسبوعيًا</caption>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.start}>
              <th>{formatDate(w.start, 'short')}</th>
              <td>{w.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
