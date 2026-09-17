'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Card, Field, Input } from '@/components/ui'
import { formatDate, formatNumber } from '@/lib/utils'
import {
  addPendingWorkout,
  generateId,
  isNetworkError,
  type OfflineWorkout,
} from '@/lib/offline'

export type TodaysExercises = Array<{
  pdeId: string
  exerciseId: string
  name: string
  muscleGroup: string
  prescribedSets: number
  prescribedReps: string | null
  targetWeight: string | null
  last: {
    date: string
    sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }>
  } | null
}>

type DraftSet = { done: boolean; weight: string; reps: string; is_warmup: boolean }
type DraftExercise = {
  exerciseId: string
  name: string
  muscleGroup: string
  prescription: string
  last: TodaysExercises[number]['last']
  sets: DraftSet[]
}

function toNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

function seedSets(sets: number): DraftSet[] {
  const count = Math.max(sets, 1)
  return Array.from({ length: count }, (_, i) => ({
    done: false,
    weight: '',
    reps: '',
    is_warmup: i === 0,
  }))
}

function buildOfflineWorkout(
  date: string,
  notes: string,
  planDayId: string | null,
  exercisesToSave: DraftExercise[]
): OfflineWorkout {
  return {
    workoutId: generateId(),
    date,
    notes: notes.trim() || null,
    plan_day_id: planDayId,
    exercises: exercisesToSave.map((ex, i) => {
      const sets: OfflineWorkout['exercises'][number]['sets'] = []
      let setNumber = 1
      for (const s of ex.sets) {
        const weight = toNumber(s.weight)
        const reps = toNumber(s.reps)
        if (weight == null && reps == null) continue
        sets.push({ set_number: setNumber++, weight_kg: weight, reps, is_warmup: s.is_warmup })
      }
      return { weId: generateId(), exercise_id: ex.exerciseId, position: i, sets }
    }),
    queuedAt: new Date().toISOString(),
  }
}

function SetProgress({
  typed,
  last,
}: {
  typed: DraftSet
  last: { weight_kg: number | null; reps: number | null } | undefined
}) {
  if (!last) return null

  const weight = toNumber(typed.weight)
  const reps = toNumber(typed.reps)
  const lastWeight = last.weight_kg
  const lastReps = last.reps
  const base = 'mt-1 pl-[4rem] text-[10px] font-medium sm:pl-[5.5rem]'

  if (weight == null && reps == null) {
    return (
      <p className={`${base} text-zinc-600`}>
        Last: {lastWeight != null ? `${formatNumber(lastWeight, 2)} kg` : '—'} × {lastReps ?? '—'}
      </p>
    )
  }

  if (weight != null) {
    let tone = 'text-zinc-500'
    let msg: string
    if (lastWeight == null) {
      msg = 'First time logging a weight for this set.'
    } else if (weight > lastWeight) {
      tone = 'text-lime-400'
      const diff = Math.round((weight - lastWeight) * 100) / 100
      msg = `↑ Pushing! ${formatNumber(weight, 2)} kg vs last ${formatNumber(lastWeight, 2)} kg (+${formatNumber(diff, 2)})`
    } else if (weight < lastWeight) {
      tone = 'text-amber-400'
      const diff = Math.round((lastWeight - weight) * 100) / 100
      msg = `↓ Below last — last was ${formatNumber(lastWeight, 2)} kg (${formatNumber(weight, 2)} kg, −${formatNumber(diff, 2)})`
    } else {
      msg = `Same as last — ${formatNumber(lastWeight, 2)} kg`
    }
    return <p className={`${base} ${tone}`}>{msg}</p>
  }

  if (reps != null) {
    let tone = 'text-zinc-500'
    let msg: string
    if (lastReps == null) {
      msg = 'First time logging reps for this set.'
    } else if (reps > lastReps) {
      tone = 'text-lime-400'
      msg = `↑ More reps than last — ${reps} vs ${lastReps} (+${reps - lastReps})`
    } else if (reps < lastReps) {
      tone = 'text-amber-400'
      msg = `↓ Fewer reps than last — last was ${lastReps} (${reps})`
    } else {
      msg = `Same reps as last — ${lastReps}`
    }
    return <p className={`${base} ${tone}`}>{msg}</p>
  }

  return null
}

export function TodayChecklist({
  planDayId,
  dayName,
  today,
  exercises,
}: {
  planDayId: string
  dayName: string
  today: string
  exercises: TodaysExercises
}) {
  const router = useRouter()
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState<DraftExercise[]>(() =>
    exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      prescription: `${ex.prescribedSets} × ${ex.prescribedReps ?? '—'}`,
      last: ex.last,
      sets: seedSets(ex.prescribedSets),
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedOffline, setSavedOffline] = useState(false)

  function updateSet(
    exIndex: number,
    setIndex: number,
    patch: Partial<DraftSet>
  ) {
    setAdded((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) }
          : ex
      )
    )
  }

  function addSet(exIndex: number) {
    setAdded((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: [...ex.sets, { done: false, weight: '', reps: '', is_warmup: false }] }
          : ex
      )
    )
  }

  function removeSet(exIndex: number, setIndex: number) {
    setAdded((prev) =>
      prev.map((ex, i) =>
        i === exIndex ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) } : ex
      )
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()

    const exercisesToSave = added.filter((ex) =>
      ex.sets.some((s) => toNumber(s.weight) != null || toNumber(s.reps) != null)
    )

    if (exercisesToSave.length === 0) {
      setError('Enter a weight or rep count for at least one set to save.')
      return
    }

    setSaving(true)
    setError(null)

    const offlinePayload = buildOfflineWorkout(date, notes, planDayId, exercisesToSave)

    try {
      const { data, error: workoutErr } = await supabase
        .from('workouts')
        .insert({ date, notes: notes.trim() || null, plan_day_id: planDayId })
        .select('id')
        .single()
      if (workoutErr) throw new Error(workoutErr.message)
      const workoutId = data.id

      const { data: weRows, error: weErr } = await supabase
        .from('workout_exercises')
        .insert(
          exercisesToSave.map((ex, i) => ({
            workout_id: workoutId,
            exercise_id: ex.exerciseId,
            position: i,
          }))
        )
        .select('id, exercise_id')
      if (weErr) throw new Error(weErr.message)

      const idByExercise = new Map((weRows ?? []).map((r) => [r.exercise_id, r.id]))
      const setsToInsert: Array<{
        workout_exercise_id: string
        set_number: number
        weight_kg: number | null
        reps: number | null
        is_warmup: boolean
      }> = []
      for (const ex of exercisesToSave) {
        const workoutExerciseId = idByExercise.get(ex.exerciseId)
        if (!workoutExerciseId) continue
        let setNumber = 1
        for (const s of ex.sets) {
          const weight = toNumber(s.weight)
          const reps = toNumber(s.reps)
          if (weight == null && reps == null) continue
          setsToInsert.push({
            workout_exercise_id: workoutExerciseId,
            set_number: setNumber++,
            weight_kg: weight,
            reps,
            is_warmup: s.is_warmup,
          })
        }
      }
      if (setsToInsert.length > 0) {
        const { error: setErr } = await supabase.from('sets').insert(setsToInsert)
        if (setErr) throw new Error(setErr.message)
      }

      setSavedId(workoutId)
      router.refresh()
    } catch (err) {
      if (isNetworkError(err)) {
        addPendingWorkout(offlinePayload)
        setSavedOffline(true)
        setSaving(false)
        return
      }
      setError(err instanceof Error ? err.message : 'Could not save workout.')
      setSaving(false)
    }
  }

  if (savedOffline) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-200">Workout saved offline 📥</p>
        <p className="max-w-sm text-sm text-zinc-500">
          You are offline, so this workout has been stored on your device. It will sync to
          your account automatically when you reconnect.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/today')}>
            Back to today
          </Button>
        </div>
      </Card>
    )
  }

  if (savedId) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-200">Workout saved 🎉</p>
        <p className="max-w-sm text-sm text-zinc-500">
          Nice work on {dayName}. Come back tomorrow for the next day of your plan.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push(`/history/${savedId}`)}>
            View workout
          </Button>
          <Button variant="ghost" onClick={() => router.push('/today')}>
            Back to today
          </Button>
        </div>
      </Card>
    )
  }

  const gridCols =
    'grid grid-cols-[2.25rem_1.75rem_1fr_1fr_1.75rem] items-center gap-2 sm:grid-cols-[3rem_2.5rem_1fr_1fr_2.5rem]'

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notes (optional)">
            <Input
              type="text"
              placeholder="Felt strong today 💪"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="space-y-4">
        <p className="text-[11px] text-zinc-600">
          Set 1 of each exercise is logged as a warm-up — tap a set number to toggle it.
        </p>
        {added.map((ex, exIndex) => (
          <Card key={ex.exerciseId} className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-zinc-50">{ex.name}</h3>
                <Badge>{ex.muscleGroup}</Badge>
                <Badge tone="accent">{ex.prescription}</Badge>
              </div>
            </div>

            {ex.last && ex.last.sets.length > 0 ? (
              <p className="mb-3 text-xs text-zinc-500">
                Last time ({formatDate(ex.last.date)}) — see the set overlay below
              </p>
            ) : (
              <p className="mb-3 text-xs text-zinc-600">First time doing this in the past 2 weeks.</p>
            )}

            <div className={`${gridCols} pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500`}>
              <span>Done</span>
              <span>Set</span>
              <span>Weight (kg)</span>
              <span>Reps</span>
              <span />
            </div>

            <div className="space-y-2">
              {ex.sets.map((s, setIndex) => (
                <div key={setIndex}>
                  <div className={gridCols}>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={(e) => updateSet(exIndex, setIndex, { done: e.target.checked })}
                        className="h-4 w-4 accent-lime-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSet(exIndex, setIndex, { is_warmup: !s.is_warmup })
                      }
                      aria-pressed={s.is_warmup}
                      aria-label={`Set ${setIndex + 1}${s.is_warmup ? ', warm-up' : ''} — toggle warm-up`}
                      className={`flex flex-col items-center justify-center gap-0.5 text-sm font-medium ${
                        s.done ? 'text-lime-400' : 'text-zinc-400'
                      }`}
                    >
                      {setIndex + 1}
                      {s.is_warmup ? (
                        <span className="rounded bg-sky-500/15 px-1 text-[8px] font-bold uppercase leading-tight text-sky-400">
                          WU
                        </span>
                      ) : null}
                    </button>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      placeholder={`Last: ${ex.last?.sets[setIndex]?.weight_kg != null ? ex.last.sets[setIndex].weight_kg : ''}`}
                      value={s.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, { weight: e.target.value })}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="0"
                      placeholder={`Last: ${ex.last?.sets[setIndex]?.reps ?? ''}`}
                      value={s.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, { reps: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(exIndex, setIndex)}
                      disabled={ex.sets.length === 1}
                      className="text-sm text-zinc-600 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Remove set"
                    >
                      ✕
                    </button>
                  </div>
                  <SetProgress typed={s} last={ex.last?.sets[setIndex]} />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => addSet(exIndex)}
            >
              + Add set
            </Button>
          </Card>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} variant="primary">
          {saving ? 'Saving…' : 'Save workout'}
        </Button>
      </div>
    </form>
  )
}