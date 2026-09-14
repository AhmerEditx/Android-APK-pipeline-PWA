'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EffectiveExercise } from '@/lib/plan-exercises'
import { setPendingPlanExercises, clearPendingPlanExercises } from '@/lib/plan-edit-store'
import { Badge, Button, Card, Input } from '@/components/ui'
import { TrashIcon } from './icons'

export type CatalogExercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  primary_muscle: string | null
}

type EditorDay = { id: string; name: string; position: number }

function deepCopy(
  days: EditorDay[],
  source: Record<string, EffectiveExercise[]>
): Record<string, EffectiveExercise[]> {
  const copy: Record<string, EffectiveExercise[]> = {}
  for (const day of days) copy[day.id] = (source[day.id] ?? []).map((e) => ({ ...e }))
  return copy
}

function exercisesEqual(a: EffectiveExercise[], b: EffectiveExercise[]) {
  if (a.length !== b.length) return false
  return a.every(
    (e, i) =>
      e.exerciseId === b[i].exerciseId &&
      e.prescribedSets === b[i].prescribedSets &&
      e.prescribedReps === b[i].prescribedReps
  )
}

export function PlanExercisesEditor({
  planId,
  userPlanId,
  days,
  currentByDay,
  templateByDay,
  catalog,
}: {
  planId: string
  userPlanId: string | null
  days: EditorDay[]
  currentByDay: Record<string, EffectiveExercise[]>
  templateByDay: Record<string, EffectiveExercise[]>
  catalog: CatalogExercise[]
}) {
  const router = useRouter()
  const started = userPlanId !== null
  const orderedDays = [...days].sort((a, b) => a.position - b.position)

  const [byDay, setByDay] = useState<Record<string, EffectiveExercise[]>>(() =>
    deepCopy(orderedDays, currentByDay)
  )
  const [pickerDay, setPickerDay] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(catalog.map((e) => e.muscle_group))).sort(),
    [catalog]
  )

  const addedIds = useMemo(() => {
    if (!pickerDay) return new Set<string>()
    return new Set((byDay[pickerDay] ?? []).map((e) => e.exerciseId))
  }, [byDay, pickerDay])

  const results = useMemo(() => {
    return catalog
      .filter((e) => !addedIds.has(e.id))
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 12)
  }, [catalog, addedIds, muscleFilter, query])

  const dirty = orderedDays.some(
    (day) =>
      !exercisesEqual(
        byDay[day.id] ?? [],
        templateByDay[day.id] ?? []
      )
  )

  useEffect(() => {
    if (started) return
    const isDirty = orderedDays.some(
      (day) => !exercisesEqual(byDay[day.id] ?? [], templateByDay[day.id] ?? [])
    )
    if (isDirty) {
      setPendingPlanExercises(planId, byDay)
    } else {
      clearPendingPlanExercises(planId)
    }
  }, [byDay, planId, started, templateByDay, orderedDays])

  function updateExercise(dayId: string, index: number, patch: Partial<EffectiveExercise>) {
    setByDay((prev) => {
      const list = prev[dayId] ?? []
      return {
        ...prev,
        [dayId]: list.map((e, i) => (i === index ? { ...e, ...patch } : e)),
      }
    })
  }

  function removeExercise(dayId: string, index: number) {
    setByDay((prev) => {
      const list = prev[dayId] ?? []
      return { ...prev, [dayId]: list.filter((_, i) => i !== index) }
    })
  }

  function addExercise(dayId: string, exercise: CatalogExercise) {
    setByDay((prev) => ({
      ...prev,
      [dayId]: [
        ...(prev[dayId] ?? []),
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
      ],
    }))
    setPickerDay(null)
    setQuery('')
    setMuscleFilter(null)
  }

  function resetToTemplate() {
    setByDay(deepCopy(orderedDays, templateByDay))
    setPickerDay(null)
    setError(null)
    if (!started) clearPendingPlanExercises(planId)
  }

  async function save() {
    if (!userPlanId) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      for (const day of orderedDays) {
        const { error: delErr } = await supabase
          .from('user_plan_exercises')
          .delete()
          .eq('user_plan_id', userPlanId)
          .eq('plan_day_id', day.id)
        if (delErr) throw new Error(delErr.message)

        const rows = byDay[day.id] ?? []
        if (rows.length === 0) continue

        const { error: insErr } = await supabase.from('user_plan_exercises').insert(
          rows.map((r, i) => ({
            user_id: user.id,
            user_plan_id: userPlanId,
            plan_day_id: day.id,
            exercise_id: r.exerciseId,
            position: i + 1,
            prescribed_sets: r.prescribedSets,
            prescribed_reps: r.prescribedReps || null,
            target_weight: r.targetWeight || null,
          }))
        )
        if (insErr) throw new Error(insErr.message)
      }
      clearPendingPlanExercises(planId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save exercises.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {!started && (
        <p className="rounded-lg border border-lime-400/20 bg-lime-400/5 px-4 py-3 text-sm text-lime-300">
          Customise the exercises below — your changes will be used when you start this plan.
        </p>
      )}

      {orderedDays.map((day) => {
        const list = byDay[day.id] ?? []
        const pickerOpen = pickerDay === day.id
        return (
          <Card key={day.id} className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge tone="accent">Day {day.position}</Badge>
              <h2 className="font-semibold text-zinc-50">{day.name}</h2>
            </div>

            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-sm text-zinc-500">
                No exercises yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {list.map((exercise, index) => (
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
                            updateExercise(day.id, index, {
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
                          onChange={(e) =>
                            updateExercise(day.id, index, {
                              prescribedReps: e.target.value,
                            })
                          }
                          className="w-20 px-2 py-1 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeExercise(day.id, index)}
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

            <div className="mt-4">
              {pickerOpen ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-300">Add an exercise</span>
                    <button
                      type="button"
                      onClick={() => setPickerDay(null)}
                      className="text-sm text-zinc-500 hover:text-zinc-200"
                    >
                      Close
                    </button>
                  </div>
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
                          onClick={() => addExercise(day.id, exercise)}
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
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setPickerDay(day.id)}>
                  + Add exercise
                </Button>
              )}
            </div>
          </Card>
        )
      })}

      {started ? (
        <div>
          {error ? (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}
          <p className="mb-3 text-sm text-zinc-500">
            Changes apply to your copy of the plan and show up on Today.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save exercises'}
            </Button>
            <Button variant="secondary" onClick={resetToTemplate} disabled={!dirty}>
              Restore template
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={resetToTemplate} disabled={!dirty}>
            Restore template
          </Button>
        </div>
      )}
    </div>
  )
}
