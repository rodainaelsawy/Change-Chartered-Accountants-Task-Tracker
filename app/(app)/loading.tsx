import { Spinner } from '@/components/submit-button'

/** Shown while a page loads (H1: visibility of system status). */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-500" role="status">
      <Spinner className="h-6 w-6 text-brand-700" />
      جارٍ التحميل…
    </div>
  )
}
