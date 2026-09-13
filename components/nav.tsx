'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './logout-button'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/today', label: 'Today' },
  { href: '/plans', label: 'Plans' },
  { href: '/workouts/new', label: 'Log Workout' },
  { href: '/history', label: 'History' },
  { href: '/progress', label: 'Progress' },
]

export function Nav() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      const user = data.user
      setAuthed(Boolean(user))
      setReady(true)
      if (!user) return

      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .is('read_at', null),
      ])
      if (cancelled) return
      setIsAdmin(Boolean(profile?.is_admin))
      setUnread(count ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const links = [...navLinks]
  if (isAdmin) links.push({ href: '/admin', label: 'Admin' })
  links.push({ href: '/messages', label: 'Messages' })

  const isAuthPage = pathname === '/login' || pathname === '/signup'

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

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
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  {link.label}
                  {link.href === '/messages' && unread > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-bold text-zinc-950">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {ready && !isAuthPage && authed ? (
            <>
              <nav className="flex items-center gap-1 lg:hidden">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative rounded-md px-2 py-1.5 text-xs transition-colors ${
                      isActive(link.href)
                        ? 'bg-zinc-800 text-zinc-50'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                    }`}
                  >
                    {link.label}
                    {link.href === '/messages' && unread > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lime-400 px-0.5 text-[9px] font-bold text-zinc-950">
                        {unread}
                      </span>
                    ) : null}
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