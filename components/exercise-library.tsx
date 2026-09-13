'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/lib/supabase/types'
import { Badge, Card, EmptyState, Input, PageHeader } from '@/components/ui'

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(),
    [exercises]
  )

  const filtered = useMemo(() => {
    return exercises
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [exercises, muscleFilter, query])

  return (
    <div>
      <PageHeader title="Exercise library" description="A curated catalog of exercises you can log." />

      <Input
        type="search"
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 max-w-md"
      />

      <div className="mb-6 flex flex-wrap gap-2">
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

      {filtered.length === 0 ? (
        <EmptyState title="No exercises found" description="Try a different search or muscle group." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((exercise) => (
            <Card key={exercise.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {exercise.primary_muscle ?? exercise.muscle_group}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge tone="accent">{exercise.muscle_group}</Badge>
                {exercise.equipment ? <Badge tone="muted">{exercise.equipment}</Badge> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}