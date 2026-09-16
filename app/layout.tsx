import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'
import { AppBridge } from '@/components/app-bridge'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'IronTrack',
    template: '%s · IronTrack',
  },
  description: 'Track your workouts, sets, reps, and progress anywhere.',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IronTrack',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100" suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <AppBridge />
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:pb-8">{children}</main>
        <footer className="hidden border-t border-zinc-800/80 pt-6 pb-10 lg:block">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 text-sm text-zinc-600">
            <span>© {new Date().getFullYear()} IronTrack</span>
            <nav className="flex items-center gap-6">
              <Link href="/about" className="transition-colors hover:text-zinc-300">
                About
              </Link>
              <Link href="/feedback" className="transition-colors hover:text-zinc-300">
                Feedback
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}