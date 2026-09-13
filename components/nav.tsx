'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './logout-button'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/workouts/new', label: 'Log Workout' },
  { href: '/history', label: 'History' },
  { href: '/exercises', label: 'Exercises' },
  { href: '/progress', label: 'Progress' },
]

export function Nav() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setAuthed(Boolean(data.user))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-zinc-50">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-lime-400 text-sm font-black text-zinc-950">
            I
          </span>
          IronTrack
        </Link>

        {ready && !isAuthPage && authed ? (
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {ready && !isAuthPage && authed ? (
            <>
              <nav className="flex items-center gap-1 md:hidden">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}