import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claude Assistant Dashboard',
  description: 'Personal assistant dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}