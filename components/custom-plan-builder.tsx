'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CatalogExercise } from './plan-exercises-editor'
import { Badge, Button, Card, Field, Input } from '@/components/ui'
import { TrashIcon } from './icons'

type BuilderExercise = {
  exercise_id: string
  name: string
  prescribed_sets: number
  prescribed_reps: string
}

type BuilderDay = {
  name: string
  exercises: BuilderExercise[]
}

type TemplateSummary = {
  id: string
  name: string
  days_count: number
  days: BuilderDay[]
}

function blankDay(index: number): BuilderDay {
  return { name: `Day ${index + 1}`, exercises: [] }
}

function blankDays(count: number): BuilderDay[] {
  return Array.from({ length: count }, (_, i) => blankDay(i))
}

const REPS_OPTIONS = ['8-10', '10-12', '12-15', '4-6', '6-8']

export function CustomPlanBuilder({
  templates,
  catalog,
}: {
  templates: TemplateSummary[]
  catalog: CatalogExercise[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'template' | 'blank'>('blank')
  const [planName, setPlanName] = useState('')
  const [templateId, setTemplateId] = useState<string>('')
  const [templateLoaded, setTemplateLoaded] = useState(false)
  const [dayCount, setDayCount] = useState(3)
  const [days, setDays] = useState<BuilderDay[]>(() => blankDays(3))
  const [focusedDay, setFocusedDay] = useState(0)
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(catalog.map((e) => e.muscle_group))).sort(),
    [catalog]
  )

  const addedIds = useMemo(
    () => new Set(days[focusedDay]?.exercises.map((e) => e.exercise_id) ?? []),
    [days, focusedDay]
  )

  const results = useMemo(() => {
    return catalog
      .filter((e) => !addedIds.has(e.id))
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 12)
  }, [catalog, addedIds, muscleFilter, query])

  function chooseTemplate(id: string) {
    const t = templates.find((tpl) => tpl.id === id)
    if (!t) return
    if (
      !templateLoaded &&
      days.some((d) => d.exercises.length > 0) &&
      !window.confirm(
        'Cloning a template will replace everything you built from scratch. This cannot be undone. Continue?'
      )
    ) {
      return
    }
    setTemplateId(id)
    setTemplateLoaded(true)
    setPlanName(t.name)
    setDayCount(t.days.length)
    setDays(
      t.days.map((d) => ({
        name: d.name,
        exercises: d.exercises.map((e) => ({ ...e })),
      }))
    )
  }

  function switchMode(next: 'template' | 'blank') {
    if (next === 'blank' && templateLoaded) {
      if (
        !window.confirm(
          'Switching to a blank plan will discard the cloned template. This cannot be undone. Continue?'
        )
      ) {
        return
      }
      setTemplateId('')
      setTemplateLoaded(false)
      setPlanName('')
      setDayCount(3)
      setDays(blankDays(3))
      setFocusedDay(0)
    }
    setMode(next)
    setError(null)
  }

  function setCount(count: number) {
    const c = Math.min(Math.max(count, 1), 7)
    setDayCount(c)
    setDays((prev) =>
      prev.length === c ? prev : blankDays(c).map((d, i) => prev[i] ?? d)
    )
  }

  function updateDay(index: number, patch: Partial<BuilderDay>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function addExercise(exercise: CatalogExercise, dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                {
                  exercise_id: exercise.id,
                  name: exercise.name,
                  prescribed_sets: 3,
                  prescribed_reps: '10-12',
                },
              ],
            }
          : d
      )
    )
    setQuery('')
    setMuscleFilter(null)
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<BuilderExercise>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises: d.exercises.map((e, j) => (j === exIndex ? { ...e, ...patch } : e)),
            }
          : d
      )
    )
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) }
          : d
      )
    )
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex))
    if (focusedDay >= dayIndex) setFocusedDay(0)
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

      const cleanName = planName.trim()
      if (!cleanName) throw new Error('Give your plan a name.')
      const nonEmptyDays = days.filter((d) => d.exercises.length > 0)
      if (nonEmptyDays.length === 0) throw new Error('Add at least one exercise to any day.')

      const { data: created, error: planErr } = await supabase
        .from('plans')
        .insert({
          name: cleanName,
          description: `${nonEmptyDays.length}-day custom plan`,
          days_count: nonEmptyDays.length,
          is_public: false,
          owner_id: user.id,
        })
        .select('id')
        .single()
      if (planErr) throw new Error(planErr.message)
      const planId = created.id

      const { data: createdDays, error: daysErr } = await supabase
        .from('plan_days')
        .insert(
          nonEmptyDays.map((d, i) => ({
            plan_id: planId,
            name: d.name.trim() || `Day ${i + 1}`,
            position: i + 1,
          }))
        )
        .select('id, position')
      if (daysErr) throw new Error(daysErr.message)

      const idByPosition = new Map(
        (createdDays ?? []).map((d) => [d.position as number, d.id as string])
      )

      const exerciseRows: Array<{
        plan_day_id: string
        exercise_id: string
        position: number
        prescribed_sets: number
        prescribed_reps: string | null
        target_weight: string | null
      }> = []
      nonEmptyDays.forEach((day, dayIndex) => {
        const planDayId = idByPosition.get(dayIndex + 1)
        if (!planDayId) return
        day.exercises.forEach((ex, exIndex) => {
          exerciseRows.push({
            plan_day_id: planDayId,
            exercise_id: ex.exercise_id,
            position: exIndex + 1,
            prescribed_sets: ex.prescribed_sets,
            prescribed_reps: ex.prescribed_reps || null,
            target_weight: null,
          })
        })
      })
      const { error: rowsErr } = await supabase.from('plan_day_exercises').insert(exerciseRows)
      if (rowsErr) throw new Error(rowsErr.message)

      router.push(`/plans/${planId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create plan.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => switchMode('blank')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'blank'
                ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Build from scratch
          </button>
          {templates.length > 0 ? (
            <button
              type="button"
              onClick={() => switchMode('template')}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === 'template'
                  ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Clone a template
            </button>
          ) : null}
        </div>

        {mode === 'template' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseTemplate(t.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  templateId === t.id
                    ? 'border-lime-400 bg-lime-400/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <p className="font-semibold text-zinc-100">{t.name}</p>
                <p className="text-sm text-zinc-500">{t.days.length} days</p>
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Plan name">
            <Input
              type="text"
              placeholder="My custom split"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </Field>
          <Field label="Days">
            <Input
              type="number"
              min={1}
              max={7}
              inputMode="numeric"
              value={dayCount}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="sm:w-24"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {days.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setFocusedDay(i)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                focusedDay === i
                  ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {d.name.trim() || `Day ${i + 1}`} · {d.exercises.length}
            </button>
          ))}
        </div>
      </Card>

      {days.length === 0 ? (
        <p className="text-sm text-zinc-500">Add at least one day to get started.</p>
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Field label="Day name">
              <Input
                type="text"
                value={days[focusedDay]?.name ?? ''}
                onChange={(e) => updateDay(focusedDay, { name: e.target.value })}
                className="sm:w-56"
              />
            </Field>
            {days.length > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => removeDay(focusedDay)}>
                Remove day
              </Button>
            ) : null}
          </div>

          {days[focusedDay]?.exercises.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-sm text-zinc-500">
              No exercises in this day yet — add some below.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {days[focusedDay]?.exercises.map((ex, exIndex) => (
                <div
                  key={`${ex.exercise_id}-${exIndex}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span className="font-medium text-zinc-100">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                      Sets
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={ex.prescribed_sets}
                        onChange={(e) =>
                          updateExercise(focusedDay, exIndex, {
                            prescribed_sets: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-16 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                      Reps
                      <select
                        value={ex.prescribed_reps}
                        onChange={(e) =>
                          updateExercise(focusedDay, exIndex, { prescribed_reps: e.target.value })
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                      >
                        {REPS_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeExercise(focusedDay, exIndex)}
                      aria-label={`Remove ${ex.name}`}
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
                    onClick={() => addExercise(exercise, focusedDay)}
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
        </Card>
      )}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Creating…' : 'Create plan'}
        </Button>
      </div>
    </div>
  )
}