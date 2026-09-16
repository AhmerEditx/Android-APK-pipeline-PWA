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

export function OfflineSync() {
  const [online, setOnline] = useState(() => isOnline())
  const [pending, setPending] = useState(() => getPendingCount())
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    if (!isOnline()) return
    const items = getPendingWorkouts()
    if (items.length === 0) return

    syncingRef.current = true

    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
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
        if (isNetworkError(err)) break
        removePendingWorkout(item.workoutId)
        setPending(getPendingCount())
      }
    }

    syncingRef.current = false
    setSyncing(false)
  }, [])

  useEffect(() => {
    const initialSync = setTimeout(syncNow, 0)

    const onOnline = () => {
      setOnline(true)
      syncNow()
    }
    const onOffline = () => setOnline(false)
    const onVisibility = () => {
      if (!document.hidden) {
        setOnline(isOnline())
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
      clearTimeout(initialSync)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onVisibility)
      document.removeEventListener('visibilitychange', onVisibility)
      unsubscribe()
    }
  }, [syncNow])

  if (!online && pending > 0) {
    return (
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-950/90 px-4 py-3 text-sm text-amber-200 shadow-lg backdrop-blur">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
          <span>Offline — {pending} workout{pending === 1 ? '' : 's'} stored locally. Will sync when you reconnect.</span>
        </div>
      </div>
    )
  }

  if (online && pending > 0) {
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