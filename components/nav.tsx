'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './logout-button'
import {
  AdminIcon,
  BackIcon,
  ChartIcon,
  ChevronIcon,
  CloseIcon,
  FeedbackIcon,
  HistoryIcon,
  HomeIcon,
  MessagesIcon,
  MoreIcon,
  PlansIcon,
  ProfileIcon,
  TodayIcon,
  TrophyIcon,
} from './icons'

const desktopLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/today', label: 'Today' },
  { href: '/plans', label: 'Plans' },
  { href: '/history', label: 'History' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
]

const tabBarLinks = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/today', label: 'Today', icon: TodayIcon },
  { href: '/plans', label: 'Plans', icon: PlansIcon },
  { href: '/progress', label: 'Progress', icon: ChartIcon },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unread, setUnread] = useState(0)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileEmail, setProfileEmail] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const [canBack, setCanBack] = useState(false)
  const stackRef = useRef<string[]>([])

  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMoreOpen(false)
  }

  useEffect(() => {
    const stack = stackRef.current
    if (stack[stack.length - 1] !== pathname) {
      if (stack.length > 30) stack.shift()
      stack.push(pathname)
    }
    setCanBack(stack.length > 1)
  }, [pathname])

  const goBack = () => {
    const stack = stackRef.current
    if (stack.length < 2) return
    stack.pop()
    setCanBack(stack.length > 1)
    const target = stack[stack.length - 1]
    if (target) router.push(target)
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      const stack = stackRef.current
      if (stack.length > 1) {
        stack.pop()
        setCanBack(stack.length > 1)
        const target = stack[stack.length - 1]
        if (target) router.push(target)
      } else if (canGoBack) {
        history.back()
      } else {
        App.exitApp()
      }
    })
    return () => {
      listenerPromise.then((listener) => listener.remove())
    }
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      const user = data.user
      setAuthed(Boolean(user))
      setReady(true)
      if (!user) {
        stackRef.current = []
        setCanBack(false)
        return
      }

      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_admin, full_name, email')
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
      setProfileName(profile?.full_name ?? null)
      setProfileEmail(profile?.email ?? null)
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
    description: string
    icon: ComponentType<{ className?: string }>
    badge?: number
  }> = [
    { href: '/history', label: 'History', description: 'Past workouts and sessions', icon: HistoryIcon },
    { href: '/achievements', label: 'Achievements', description: 'Milestones and streak badges', icon: TrophyIcon },
    { href: '/messages', label: 'Messages', description: 'Messages from the app', icon: MessagesIcon, badge: unread },
    { href: '/feedback', label: 'Feedback', description: 'Report a bug, suggest an idea', icon: FeedbackIcon },
    { href: '/profile', label: 'Profile', description: 'Account, stats and settings', icon: ProfileIcon },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', description: 'Manage members and messages', icon: AdminIcon }] : []),
  ]

  const showNav = ready && !isAuthPage && authed

  const accountName = profileName?.trim() || profileEmail?.split('@')[0] || 'Athlete'
  const initials = accountName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            {showNav && canBack ? (
              <button
                type="button"
                onClick={goBack}
                aria-label="Go back"
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 lg:hidden"
              >
                <BackIcon className="h-5 w-5" />
              </button>
            ) : null}
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-zinc-50">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-lime-400 text-sm font-black text-zinc-950">
                I
              </span>
              <span className="truncate">IronTrack</span>
            </Link>
          </div>

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
                className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-base font-bold text-zinc-100">More</span>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 transition-colors hover:bg-zinc-800/60"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-lg font-black text-zinc-950 shadow-lg shadow-lime-500/10">
                    {initials || 'I'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-50">
                      {accountName}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {profileEmail ?? 'Manage your profile'}
                    </span>
                  </span>
                  <ChevronIcon className="h-5 w-5 shrink-0 text-zinc-600" />
                </Link>

                <div className="mt-2 grid gap-2">
                  {sheetLinks.map((link) => {
                    const Icon = link.icon
                    const active = isActive(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                          active
                            ? 'border-lime-400/30 bg-lime-400/5'
                            : 'border-transparent bg-zinc-950/60 hover:border-zinc-800 hover:bg-zinc-800/60'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            active
                              ? 'bg-lime-400/15 text-lime-300'
                              : 'bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700 group-hover:text-zinc-100'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-100">
                            {link.label}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {link.description}
                          </span>
                        </span>
                        {link.badge ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lime-400 px-1 text-[11px] font-bold text-zinc-950">
                            {link.badge}
                          </span>
                        ) : null}
                        <ChevronIcon className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                      </Link>
                    )
                  })}
                </div>

                <div className="mt-2 border-t border-zinc-800 pt-2">
                  <LogoutButton asSheetRow />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  )
}