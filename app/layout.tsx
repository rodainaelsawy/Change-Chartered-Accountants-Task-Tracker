import type { Metadata, Viewport } from 'next'
// Self-hosted Arabic font "Alexandria" (variable weights, no request to Google at runtime).
import '@fontsource-variable/alexandria/wght.css'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'متابعة المهام', template: '%s · متابعة المهام' },
  description: 'متابعة مهام الشركات ومواعيد التسليم',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#12416b' }

// Applies the saved light/dark choice before the first paint (no flash). See components/theme-toggle.tsx.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}
