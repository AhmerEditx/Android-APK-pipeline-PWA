'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  generateId,
  getPendingCount,
  getPendingWorkouts,
  isNetworkError,
  isOnline,
  removePendingWorkout,
  subscribePending,
  type OfflineWorkout,
} from '@/lib/offline'

async function insertWorkoutOnline(workout: OfflineWorkout) {
  const supabase = createClient()

  const { data: workoutRow, error: workoutErr } = await supabase
    .from('workouts')
    .upsert(
      {
        id: workout.workoutId,
        date: workout.date,
        notes: workout.notes,
        plan_day_id: workout.plan_day_id,
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single()
  if (workoutErr) throw new Error(workoutErr.message)
  const workoutId = workoutRow.id

  if (workout.exercises.length > 0) {
    const { error: weErr } = await supabase.from('workout_exercises').upsert(
      workout.exercises.map((ex) => ({
        id: ex.weId,
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        position: ex.position,
      })),
      { onConflict: 'id' }
    )
    if (weErr) throw new Error(weErr.message)
  }

  const allSets = workout.exercises.flatMap((ex) =>
    ex.sets.map((s) => ({
      id: generateId(),
      workout_exercise_id: ex.weId,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
      is_warmup: s.is_warmup ?? false,
    }))
  )
  if (allSets.length > 0) {
    const { error: setErr } = await supabase.from('sets').upsert(allSets, { onConflict: 'id' })
    if (setErr) throw new Error(setErr.message)
  }
}

// navigator.onLine is unreliable (reports false while actually online on some
// browsers/WebViews), so confirm connectivity with a real network request.
// /favicon.ico is not intercepted by the service worker, so any response
// (even an HTTP 404) proves the network is reachable.
async function probeNetwork(): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    await fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function OfflineSync() {
  const [online, setOnline] = useState<boolean | null>(null)
  const [pending, setPending] = useState(() => getPendingCount())
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)
  const probingRef = useRef(false)
  const onlineRef = useRef<boolean | null>(null)

  function setOnlineState(value: boolean) {
    onlineRef.current = value
    setOnline(value)
  }

  const determineOnline = useCallback(async () => {
    if (probingRef.current) return
    probingRef.current = true
    try {
      setOnlineState(await probeNetwork())
    } finally {
      probingRef.current = false
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    if (onlineRef.current === false) return
    const items = getPendingWorkouts()
    if (items.length === 0) return

    syncingRef.current = true

    const supabase = createClient()
    let auth: { user: { id: string } | null }
    try {
      const res = await supabase.auth.getUser()
      auth = { user: res.data?.user ?? null }
    } catch (err) {
      if (isNetworkError(err)) {
        syncingRef.current = false
        setOnlineState(false)
        return
      }
      throw err
    }
    if (!auth.user) {
      syncingRef.current = false
      return
    }

    setSyncing(true)

    for (const item of items) {
      try {
        await insertWorkoutOnline(item)
        removePendingWorkout(item.workoutId)
        setPending(getPendingCount())
      } catch (err) {
        if (isNetworkError(err)) {
          setOnlineState(false)
          break
        }
        removePendingWorkout(item.workoutId)
        setPending(getPendingCount())
      }
    }

    syncingRef.current = false
    setSyncing(false)
  }, [])

  useEffect(() => {
    // Offline: force internal <Link> clicks to full page loads so the service
    // worker can serve cached HTML. Client-side (RSC) navigation needs the
    // network, so it would silently fail without this.
    function onClickCapture(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const element = e.target
      if (!(element instanceof Element)) return
      const anchor = element.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      const url = new URL(href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (isOnline()) return
      e.preventDefault()
      e.stopPropagation()
      window.location.assign(url.href)
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  useEffect(() => {
    determineOnline()

    const onOnline = () => {
      setOnlineState(true)
      syncNow()
    }
    const onOffline = () => determineOnline()
    const onVisibility = () => {
      if (!document.hidden) {
        determineOnline()
        syncNow()
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('focus', onVisibility)
    document.addEventListener('visibilitychange', onVisibility)
    const unsubscribe = subscribePending(() => {
      setPending(getPendingCount())
    })

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onVisibility)
      document.removeEventListener('visibilitychange', onVisibility)
      unsubscribe()
    }
  }, [determineOnline, syncNow])

  // While confirmed offline, keep re-probing so a reconnect is picked up even
  // if the browser never fires an 'online' event.
  useEffect(() => {
    if (online !== false) return
    const id = setInterval(() => {
      determineOnline()
      syncNow()
    }, 15000)
    return () => clearInterval(id)
  }, [online, determineOnline, syncNow])

  if (online === false) {
    return (
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-950/90 px-4 py-3 text-sm text-amber-200 shadow-lg backdrop-blur">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
          <span>
            {pending > 0
              ? `Offline — ${pending} workout${pending === 1 ? '' : 's'} stored locally. Will sync when you reconnect.`
              : 'Offline — showing saved copy. Workouts you log will sync when you reconnect.'}
          </span>
        </div>
      </div>
    )
  }

  if (pending > 0) {
    return (
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-lime-400/30 bg-lime-950/90 px-4 py-3 text-sm text-lime-200 shadow-lg backdrop-blur">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-lime-400" />
          <span>{syncing ? 'Syncing…' : `${pending} workout${pending === 1 ? '' : 's'} waiting to sync`}</span>
        </div>
      </div>
    )
  }

  return null
}