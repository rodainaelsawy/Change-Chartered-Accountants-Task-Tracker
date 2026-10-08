'use client'

import Link from 'next/link'

/** Arabic error page with recovery options (H9: help users recognize, diagnose and recover from errors). */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">!</div>
      <h1 className="text-xl font-bold text-slate-900">تعذّر تحميل هذه الصفحة</h1>
      <p className="max-w-md text-slate-600">
        حدث خطأ غير متوقع. لم يتم فقدان أي بيانات محفوظة. حاول مرة أخرى، وإذا تكرر الخطأ أرسل الرمز أدناه للدعم الفني.
      </p>
      <div className="flex gap-2">
        <button onClick={() => retry()} className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-800">
          إعادة المحاولة
        </button>
        <Link href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
          العودة للوحة المتابعة
        </Link>
      </div>
      {error.digest && <p className="ltr text-xs text-slate-400">رمز الخطأ: {error.digest}</p>}
    </div>
  )
}
