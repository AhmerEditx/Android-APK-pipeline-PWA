'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database, Exercise } from '@/lib/supabase/types'
import { Badge, Button, Card, Field, Input } from '@/components/ui'

type DraftSet = {
  dbId: string | null
  weight: string
  reps: string
  is_warmup: boolean
}

type DraftExercise = {
  weId: string | null
  exercise: Exercise
  sets: DraftSet[]
}

export type InitialWorkoutData = {
  id: string
  date: string
  notes: string | null
  exercises: Array<{
    weId: string
    exercise: Exercise
    sets: Array<{
      id: string
      set_number: number
      weight_kg: number | null
      reps: number | null
      is_warmup: boolean
    }>
  }>
}

function todayLocal(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function emptySet(): DraftSet {
  return { dbId: null, weight: '', reps: '', is_warmup: false }
}

function toNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

async function syncSets(
  supabase: SupabaseClient<Database>,
  workoutExerciseId: string,
  sets: DraftSet[]
) {
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]
    const setPayload = {
      set_number: i + 1,
      weight_kg: toNumber(s.weight),
      reps: toNumber(s.reps),
      is_warmup: s.is_warmup,
    }

    if (s.dbId) {
      const { error } = await supabase
        .from('sets')
        .update(setPayload)
        .eq('id', s.dbId)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('sets')
        .insert({ workout_exercise_id: workoutExerciseId, ...setPayload })
      if (error) throw new Error(error.message)
    }
  }
}

export function WorkoutForm({ exercises, initial }: { exercises: Exercise[]; initial?: InitialWorkoutData }) {
  const router = useRouter()
  const isEdit = Boolean(initial)

  const [date, setDate] = useState(initial?.date ?? todayLocal())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [added, setAdded] = useState<DraftExercise[]>(() =>
    initial
      ? initial.exercises.map((ex) => ({
          weId: ex.weId,
          exercise: ex.exercise,
          sets: ex.sets.map((s) => ({
            dbId: s.id,
            weight: s.weight_kg == null ? '' : String(s.weight_kg),
            reps: s.reps == null ? '' : String(s.reps),
            is_warmup: s.is_warmup,
          })),
        }))
      : []
  )
  const [deletedWeIds, setDeletedWeIds] = useState<string[]>([])
  const [deletedSetIds, setDeletedSetIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(),
    [exercises]
  )

  const addedIds = useMemo(() => new Set(added.map((e) => e.exercise.id)), [added])

  const results = useMemo(() => {
    return exercises
      .filter((e) => !addedIds.has(e.id))
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 12)
  }, [exercises, addedIds, muscleFilter, query])

  function addExercise(exercise: Exercise) {
    setAdded((prev) => [...prev, { weId: null, exercise, sets: [emptySet()] }])
    setQuery('')
  }

  function removeExercise(index: number) {
    const removed = added[index]
    if (removed && removed.weId) {
      setDeletedWeIds((prev) => [...prev, removed.weId!])
    }
    setAdded((prev) => prev.filter((_, i) => i !== index))
  }

  function addSet(exerciseIndex: number) {
    setAdded((prev) =>
      prev.map((ex, i) => (i === exerciseIndex ? { ...ex, sets: [...ex.sets, emptySet()] } : ex))
    )
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) {
    setAdded((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) }
          : ex
      )
    )
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    const removed = added[exerciseIndex].sets[setIndex]
    if (removed && removed.dbId) {
      setDeletedSetIds((prev) => [...prev, removed.dbId!])
    }
    setAdded((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) } : ex
      )
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (added.length === 0) {
      setError('Add at least one exercise to save the workout.')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      let workoutId = initial?.id
      const payload = { date, notes: notes.trim() || null }

      if (!workoutId) {
        const { data, error: createErr } = await supabase
          .from('workouts')
          .insert(payload)
          .select('id')
          .single()
        if (createErr) throw new Error(createErr.message)
        workoutId = data.id
      } else {
        const { error: updateErr } = await supabase
          .from('workouts')
          .update(payload)
          .eq('id', workoutId)
        if (updateErr) throw new Error(updateErr.message)
      }

      const positionByExercise = new Map<DraftExercise, number>()
      added.forEach((ex, i) => positionByExercise.set(ex, i))
      const existing = added.filter((ex) => Boolean(ex.weId))
      const created = added.filter((ex) => !ex.weId)

      for (const ex of existing) {
        await syncSets(supabase, ex.weId!, ex.sets)
      }

      const createdWeIds = new Map<string, DraftExercise>()
      if (created.length > 0) {
        const { data: weRows, error: weErr } = await supabase
          .from('workout_exercises')
          .insert(
            created.map((ex) => ({
              workout_id: workoutId,
              exercise_id: ex.exercise.id,
              position: positionByExercise.get(ex) ?? 0,
            }))
          )
          .select('id, exercise_id')
        if (weErr) throw new Error(weErr.message)
        for (const row of weRows ?? []) {
          const ex = created.find((c) => c.exercise.id === row.exercise_id)
          if (ex) createdWeIds.set(row.id, ex)
        }
      }

      const setsToInsert: Array<{
        workout_exercise_id: string
        set_number: number
        weight_kg: number | null
        reps: number | null
        is_warmup: boolean
      }> = []
      for (const [weId, ex] of createdWeIds) {
        let setNumber = 1
        for (const s of ex.sets) {
          setsToInsert.push({
            workout_exercise_id: weId,
            set_number: setNumber++,
            weight_kg: toNumber(s.weight),
            reps: toNumber(s.reps),
            is_warmup: s.is_warmup,
          })
        }
      }
      if (setsToInsert.length > 0) {
        const { error: setErr } = await supabase.from('sets').insert(setsToInsert)
        if (setErr) throw new Error(setErr.message)
      }

      for (const id of deletedSetIds) {
        const { error: delErr } = await supabase.from('sets').delete().eq('id', id)
        if (delErr) throw new Error(delErr.message)
      }
      for (const id of deletedWeIds) {
        const { error: delErr } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('id', id)
        if (delErr) throw new Error(delErr.message)
      }

      router.push(`/history/${workoutId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving the workout.')
      setSaving(false)
    }
  }

  const gridCols = 'grid grid-cols-[2.25rem_1fr_4.5rem_4.5rem_2rem] items-center gap-2 sm:grid-cols-[3rem_1fr_6rem_6rem_2.5rem]'

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
              placeholder="Great session — felt strong on presses"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Add exercises
        </h2>
        <Field label="Search the exercise library">
          <Input
            type="search"
            placeholder="e.g. Bench press"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMuscleFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              muscleFilter === null
                ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          {muscleGroups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setMuscleFilter(muscleFilter === group ? null : group)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                muscleFilter === group
                  ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {results.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
            {results.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => addExercise(exercise)}
                className="flex w-full items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-zinc-800"
              >
                <span className="font-medium text-zinc-100">{exercise.name}</span>
                <Badge tone="muted">{exercise.muscle_group}</Badge>
              </button>
            ))}
          </div>
        ) : query || muscleFilter ? (
          <p className="mt-4 text-sm text-zinc-500">No matching exercises.</p>
        ) : null}
      </div>

      {added.length > 0 ? (
        <div className="space-y-4">
          {added.map((ex, exIndex) => (
            <Card key={`${ex.exercise.id}-${exIndex}`} className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-50">{ex.exercise.name}</h3>
                  <Badge>{ex.exercise.muscle_group}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => removeExercise(exIndex)}
                  className="text-sm text-zinc-500 transition-colors hover:text-red-400"
                >
                  Remove
                </button>
              </div>

              <div className={`${gridCols} pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500`}>
                <span>Set</span>
                <span>Warm-up</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span />
              </div>

              <div className="space-y-2">
                {ex.sets.map((s, setIndex) => (
                  <div key={setIndex} className={gridCols}>
                    <span className="text-sm font-medium text-zinc-400">
                      {setIndex + 1}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={s.is_warmup}
                        onChange={(e) => updateSet(exIndex, setIndex, { is_warmup: e.target.checked })}
                        className="h-4 w-4 accent-lime-400"
                      />
                      <span className="sm:hidden lg:inline">Warm-up</span>
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={s.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, { weight: e.target.value })}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="0"
                      placeholder="0"
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
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} variant="primary">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save workout'}
        </Button>
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={() => router.push(`/history/${initial!.id}`)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}