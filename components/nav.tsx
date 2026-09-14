'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ComponentType } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './logout-button'
import {
  AdminIcon,
  ChartIcon,
  CloseIcon,
  HistoryIcon,
  HomeIcon,
  MessagesIcon,
  MoreIcon,
  PlansIcon,
  PlusIcon,
  ProfileIcon,
  TodayIcon,
} from './icons'

const desktopLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/today', label: 'Today' },
  { href: '/plans', label: 'Plans' },
  { href: '/workouts/new', label: 'Log Workout' },
  { href: '/history', label: 'History' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
]

const tabBarLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/today', label: 'Today', icon: TodayIcon },
  { href: '/workouts/new', label: 'Log', icon: PlusIcon },
  { href: '/progress', label: 'Progress', icon: ChartIcon },
]

export function Nav() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unread, setUnread] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMoreOpen(false)
  }

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

  const links = [...desktopLinks]
  if (isAdmin) links.push({ href: '/admin', label: 'Admin' })
  links.push({ href: '/messages', label: 'Messages' })

  const isAuthPage = pathname === '/login' || pathname === '/signup'

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sheetLinks: Array<{
    href: string
    label: string
    icon: ComponentType<{ className?: string }>
    badge?: number
  }> = [
    { href: '/plans', label: 'Plans', icon: PlansIcon },
    { href: '/history', label: 'History', icon: HistoryIcon },
    { href: '/messages', label: 'Messages', icon: MessagesIcon, badge: unread },
    { href: '/profile', label: 'Profile', icon: ProfileIcon },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: AdminIcon }] : []),
  ]

  const showNav = ready && !isAuthPage && authed

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-zinc-50">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-lime-400 text-sm font-black text-zinc-950">
              I
            </span>
            IronTrack
          </Link>

          {showNav ? (
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
            {showNav ? (
              <>
                <Link
                  href="/messages"
                  aria-label="Messages"
                  className={`relative hidden items-center rounded-md p-2 text-sm transition-colors lg:flex ${
                    isActive('/messages')
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  <MessagesIcon className="h-5 w-5" />
                  {unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-bold text-zinc-950">
                      {unread}
                    </span>
                  ) : null}
                </Link>
                <LogoutButton />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {showNav ? (
        <>
          <nav
            className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {tabBarLinks.map((tab) => {
              const active = isActive(tab.href)
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                    active ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {tab.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                moreOpen || sheetLinks.some((l) => isActive(l.href))
                  ? 'text-lime-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="relative">
                <MoreIcon className="h-6 w-6" />
                {unread > 0 ? (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-lime-400 px-0.5 text-[9px] font-bold text-zinc-950">
                    {unread}
                  </span>
                ) : null}
              </span>
              More
            </button>
          </nav>

          {moreOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMoreOpen(false)}
              />
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-zinc-800 bg-zinc-900 p-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
              >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700" />
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-zinc-300">More</span>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {sheetLinks.map((link) => {
                    const Icon = link.icon
                    const active = isActive(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                          active
                            ? 'bg-zinc-800 text-lime-400'
                            : 'text-zinc-300 hover:bg-zinc-800/60'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {link.label}
                        {link.badge ? (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-lime-400 px-1 text-[11px] font-bold text-zinc-950">
                            {link.badge}
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-2 border-t border-zinc-800 pt-2">
                  <LogoutButton />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  )
}