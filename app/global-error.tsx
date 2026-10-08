'use client'

/** Last-resort error page (when even the main layout fails). */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'Tahoma, Arial, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>تعذّر تحميل التطبيق</h1>
          <p style={{ color: '#475569' }}>حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.</p>
          <button onClick={() => retry()} style={{ background: '#0f766e', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
          {error.digest && <p style={{ color: '#94a3b8', fontSize: 12, direction: 'ltr' }}>رمز الخطأ: {error.digest}</p>}
        </div>
      </body>
    </html>
  )
}
