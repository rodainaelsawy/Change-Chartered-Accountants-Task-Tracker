import Link from 'next/link'
import { Card } from './ui'

/** Side panel next to forms: short contextual help (H10) so wide screens have no empty space. */
export function SideTips({ title = 'نصائح', items, links }: { title?: string; items: React.ReactNode[]; links?: { href: string; label: string }[] }) {
  return (
    <Card className="h-fit p-5 text-sm text-slate-600">
      <h2 className="mb-3 font-semibold text-slate-800">💡 {title}</h2>
      <ul className="list-disc space-y-2 ps-5">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
      {links && links.length > 0 && (
        <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-700 hover:underline">
              {l.label} ←
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

export const kbd = (k: string) => <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 font-mono text-xs">{k}</kbd>
