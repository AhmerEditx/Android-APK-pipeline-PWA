'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EffectiveExercise } from '@/lib/plan-exercises'
import type { CatalogExercise } from './plan-exercises-editor'
import { Badge, Button, Card, Input } from '@/components/ui'
import { TrashIcon } from './icons'

function exercisesEqual(a: EffectiveExercise[], b: EffectiveExercise[]) {
  if (a.length !== b.length) return false
  return a.every(
    (e, i) =>
      e.exerciseId === b[i].exerciseId &&
      e.prescribedSets === b[i].prescribedSets &&
      e.prescribedReps === b[i].prescribedReps
  )
}

export function TodayExerciseEditor({
  userPlanId,
  planDayId,
  dayName,
  currentExercises,
  templateByDay,
  catalog,
}: {
  userPlanId: string
  planDayId: string
  dayName: string
  currentExercises: EffectiveExercise[]
  templateByDay: Record<string, EffectiveExercise[]>
  catalog: CatalogExercise[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [exercises, setExercises] = useState<EffectiveExercise[]>(() =>
    currentExercises.map((e) => ({ ...e }))
  )
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(catalog.map((e) => e.muscle_group))).sort(),
    [catalog]
  )

  const addedIds = useMemo(() => new Set(exercises.map((e) => e.exerciseId)), [exercises])

  const results = useMemo(() => {
    return catalog
      .filter((e) => !addedIds.has(e.id))
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 12)
  }, [catalog, addedIds, muscleFilter, query])

  const dirty = !exercisesEqual(exercises, currentExercises)

  function close() {
    setOpen(false)
    setError(null)
    setExercises(currentExercises.map((e) => ({ ...e })))
    setQuery('')
    setMuscleFilter(null)
  }

  function updateExercise(index: number, patch: Partial<EffectiveExercise>) {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)))
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  function addExercise(exercise: CatalogExercise) {
    setExercises((prev) => [
      ...prev,
      {
        refId: '',
        fromUser: true,
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        prescribedSets: 3,
        prescribedReps: '10-12',
        targetWeight: null,
      },
    ])
    setQuery('')
    setMuscleFilter(null)
  }

  function restoreDayToTemplate() {
    setExercises((templateByDay[planDayId] ?? []).map((e) => ({ ...e })))
  }

  async function save() {
    setSaving(true)
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
        .eq('user_plan_id', userPlanId)

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
        for (const [dayId, dayExercises] of Object.entries(templateByDay)) {
          dayExercises.forEach((ex, index) => {
            materialized.push({
              user_id: user.id,
              user_plan_id: userPlanId,
              plan_day_id: dayId,
              exercise_id: ex.exerciseId,
              position: index + 1,
              prescribed_sets: ex.prescribedSets,
              prescribed_reps: ex.prescribedReps || null,
              target_weight: ex.targetWeight || null,
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

      const { error: delErr } = await supabase
        .from('user_plan_exercises')
        .delete()
        .eq('user_plan_id', userPlanId)
        .eq('plan_day_id', planDayId)
      if (delErr) throw new Error(delErr.message)

      if (exercises.length > 0) {
        const { error: insErr } = await supabase.from('user_plan_exercises').insert(
          exercises.map((ex, index) => ({
            user_id: user.id,
            user_plan_id: userPlanId,
            plan_day_id: planDayId,
            exercise_id: ex.exerciseId,
            position: index + 1,
            prescribed_sets: ex.prescribedSets,
            prescribed_reps: ex.prescribedReps || null,
            target_weight: ex.targetWeight || null,
          }))
        )
        if (insErr) throw new Error(insErr.message)
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save exercises.')
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <p className="text-sm text-zinc-400">
          {dayName} exercises — customise them for this session before logging.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Edit exercises
        </Button>
      </div>
    )
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">Edit {dayName} exercises</h2>
        <button
          type="button"
          onClick={close}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Changes apply to this day in your plan and show up next time you log it.
      </p>

      {exercises.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-sm text-zinc-500">
          No exercises yet — add some below.
        </p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {exercises.map((exercise, index) => (
            <div
              key={`${exercise.exerciseId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">{index + 1}.</span>
                <span className="font-medium text-zinc-100">{exercise.name}</span>
                <Badge tone="muted">{exercise.muscleGroup}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Sets
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={exercise.prescribedSets}
                    onChange={(e) =>
                      updateExercise(index, {
                        prescribedSets: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-16 px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Reps
                  <Input
                    type="text"
                    inputMode="text"
                    placeholder="10-12"
                    value={exercise.prescribedReps ?? ''}
                    onChange={(e) => updateExercise(index, { prescribedReps: e.target.value })}
                    className="w-20 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  aria-label={`Remove ${exercise.name}`}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <span className="mb-3 block text-sm font-semibold text-zinc-300">Add an exercise</span>
        <Input
          type="search"
          placeholder="Search the exercise library…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
        ) : (
          <p className="mt-4 text-sm text-zinc-500">No matching exercises.</p>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save exercises'}
        </Button>
        <Button variant="secondary" onClick={restoreDayToTemplate} disabled={!dirty}>
          Reset to template
        </Button>
      </div>
    </Card>
  )
}