import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/lib/translations'
import { AuthProvider } from '@/lib/auth'
import './globals.css'

// next/font renames the family to a hashed name, so it must be exposed as a CSS
// variable and referenced via that variable (not the literal 'Geist' string).
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: 'GymConnect - WhatsApp Member Manager',
  description: 'Manage your gym members and connect via WhatsApp instantly',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProvider>
        {/* Vercel-only: on Netlify /_vercel/insights/script.js 404s. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  )
}
