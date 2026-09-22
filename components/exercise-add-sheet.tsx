'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button } from '@/components/ui'
import { CloseIcon } from './icons'

export type AddTarget = {
  userPlanId: string
  planName: string
  todayPlanDayId: string | null
  days: Array<{ id: string; name: string; position: number }>
  templateDays: Array<{
    id: string
    exercises: Array<{
      exercise_id: string
      position: number
      prescribed_sets: number
      prescribed_reps: string | null
    }>
  }>
}

export function ExerciseAddSheet({
  exerciseName,
  exerciseId,
  addTarget,
  onClose,
}: {
  exerciseName: string
  exerciseId: string
  addTarget: AddTarget | null
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [addedTo, setAddedTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const options = useMemo(() => {
    if (!addTarget) return []
    const list: Array<{ key: string; dayId: string; label: string; hint: string | null }> = []
    if (addTarget.todayPlanDayId) {
      const day = addTarget.days.find((d) => d.id === addTarget.todayPlanDayId)
      list.push({
        key: 'today',
        dayId: addTarget.todayPlanDayId,
        label: "Today's workout",
        hint: day ? `${addTarget.planName} · Day ${day.position} · ${day.name}` : addTarget.planName,
      })
    }
    for (const day of [...addTarget.days].sort((a, b) => a.position - b.position)) {
      list.push({
        key: day.id,
        dayId: day.id,
        label: `Day ${day.position} · ${day.name}`,
        hint: addTarget.planName,
      })
    }
    return list
  }, [addTarget])

  async function addTo(dayId: string, label: string) {
    if (!addTarget) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const { count } = await supabase
        .from('user_plan_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('user_plan_id', addTarget.userPlanId)

      if (count === 0) {
        const materialized: Array<{
          user_id: string
          user_plan_id: string
          plan_day_id: string
          exercise_id: string
          position: number
          prescribed_sets: number
          prescribed_reps: string | null
          target_weight: string | null
        }> = []
        for (const day of addTarget.templateDays) {
          day.exercises.forEach((ex, index) => {
            materialized.push({
              user_id: user.id,
              user_plan_id: addTarget.userPlanId,
              plan_day_id: day.id,
              exercise_id: ex.exercise_id,
              position: index + 1,
              prescribed_sets: ex.prescribed_sets,
              prescribed_reps: ex.prescribed_reps,
              target_weight: null,
            })
          })
        }
        if (materialized.length > 0) {
          const { error: matErr } = await supabase
            .from('user_plan_exercises')
            .insert(materialized)
          if (matErr) throw new Error(matErr.message)
        }
      }

      const { data: positions } = await supabase
        .from('user_plan_exercises')
        .select('position')
        .eq('user_plan_id', addTarget.userPlanId)
        .eq('plan_day_id', dayId)
        .order('position', { ascending: false })
        .limit(1)
      const position = (positions?.[0]?.position ?? 0) + 1

      const { error: insErr } = await supabase.from('user_plan_exercises').insert({
        user_id: user.id,
        user_plan_id: addTarget.userPlanId,
        plan_day_id: dayId,
        exercise_id: exerciseId,
        position,
        prescribed_sets: 3,
        prescribed_reps: '10-12',
        target_weight: null,
      })
      if (insErr) {
        if (insErr.message.toLowerCase().includes('exercise_id')) {
          setError('Can’t add this exercise — it’s not linked in the system yet.')
        } else {
          throw new Error(insErr.message)
        }
        setBusy(false)
        return
      }

      setAddedTo(label)
      router.refresh()
      setBusy(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exercise.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${exerciseName} to a workout`}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Add to workout</p>
            <h2 className="mt-0.5 text-lg font-bold text-zinc-50">{exerciseName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {!addTarget ? (
          <div className="mt-4">
            <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
              No active plan — start a plan first so this exercise has a home.
            </p>
            <Link
              href="/plans"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
            >
              Browse plans
            </Link>
          </div>
        ) : addedTo ? (
          <div className="mt-4">
            <p className="rounded-lg border border-lime-400/20 bg-lime-400/5 px-4 py-3 text-sm text-lime-300">
              Added to {addedTo}.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={onClose}>
                Done
              </Button>
              <Link
                href="/today"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                See on Today
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-sm text-zinc-500">Where should it go?</p>
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={busy}
                  onClick={() => addTo(option.dayId, option.label)}
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-800 disabled:opacity-50"
                >
                  <span>
                    <span className="block font-medium text-zinc-100">{option.label}</span>
                    {option.hint ? (
                      <span className="block text-xs text-zinc-500">{option.hint}</span>
                    ) : null}
                  </span>
                  {busy ? <Badge tone="muted">Adding…</Badge> : <Badge tone="accent">+ Add</Badge>}
                </button>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}