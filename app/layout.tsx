import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Garmin Coach — Eugen',
  description: 'Personal marathon training dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
