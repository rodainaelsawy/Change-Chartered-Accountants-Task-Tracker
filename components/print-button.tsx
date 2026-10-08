'use client'

/** Opens the browser's print dialog; choose "Save as PDF" there to get a PDF (Arabic text prints correctly). */
export function PrintButton({ className, label = 'طباعة / PDF' }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  )
}
