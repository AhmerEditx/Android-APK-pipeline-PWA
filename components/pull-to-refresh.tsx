'use client'

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 60
const MAX_PULL = 96
const RESISTANCE = 0.45

// Pull down at the top of the page to refresh — for mobile/PWA/APK users.
export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshingRef = useRef(false)
  const pullRef = useRef(0)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)
  const refreshTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('ontouchstart' in window)) return

    function setPullValue(value: number) {
      pullRef.current = value
      setPull(value)
    }

    function isInsideScrollable(target: EventTarget | null): boolean {
      let el = target as Element | null
      while (el && el !== document.body) {
        if (el.scrollHeight > el.clientHeight + 4) return true
        el = el.parentElement
      }
      return false
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      if (window.scrollY > 0) return
      if (isInsideScrollable(e.target)) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullingRef.current || startYRef.current == null) return
      const diff = e.touches[0].clientY - startYRef.current
      if (diff <= 0) {
        setPullValue(0)
        return
      }
      if (window.scrollY <= 0) {
        e.preventDefault()
      }
      setPullValue(Math.min(diff * RESISTANCE, MAX_PULL))
    }

    function onTouchEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      startYRef.current = null

      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        setPullValue(0)
        refreshTimerRef.current = window.setTimeout(() => {
          window.location.reload()
        }, 600)
      } else {
        setPullValue(0)
      }
    }

    function onTouchCancel() {
      pullingRef.current = false
      startYRef.current = null
      setPullValue(0)
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchCancel)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const active = pull > 8 || refreshing
  const progress = Math.min(pull / THRESHOLD, 1)
  const spin = refreshing ? 360 : 180 * progress

  if (!active) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${Math.max(0, pull - 34)}px)` }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/90 shadow-lg"
        style={{
          opacity: refreshing ? 1 : 0.4 + progress * 0.6,
          transform: `rotate(${spin}deg)`,
        }}
      >
        {refreshing ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-lime-400">
            <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}