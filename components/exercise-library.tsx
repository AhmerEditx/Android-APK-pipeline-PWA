'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/lib/supabase/types'
import { IFBB_TOP3, ifbbRankFor } from '@/lib/ifbb-rankings'
import { Badge, Card, EmptyState, Input, PageHeader } from '@/components/ui'

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [showRanks, setShowRanks] = useState(false)

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(),
    [exercises]
  )

  const filtered = useMemo(() => {
    return exercises
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [exercises, muscleFilter, query])

  const rankedGroups = muscleGroups.filter((g) => IFBB_TOP3[g])

  return (
    <div>
      <PageHeader
        title="Exercise library"
        description="A curated catalog of exercises you can log — with the IFBB-rated top 3 for every muscle group."
      />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowRanks((v) => !v)}
          aria-expanded={showRanks}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            showRanks
              ? 'border-amber-400 bg-amber-400/10 text-amber-300'
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 2l2.9 6.26L21 9.27l-5 4.87L17.18 21 12 17.77 6.82 21 8 14.14l-5-4.87 6.1-1.01L12 2z" />
            </svg>
          </span>
          IFBB Top 3 picks
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
            {rankedGroups.length}
          </span>
        </button>

        {showRanks ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rankedGroups.map((group) => (
              <Card key={group} className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{group}</p>
                <ol className="mt-2 space-y-2">
                  {IFBB_TOP3[group].map((r) => (
                    <li key={r.rank} className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[11px] font-bold text-amber-300">
                        {r.rank}
                      </span>
                      <span>
                        <span className="text-sm font-medium text-zinc-100">{r.name}</span>
                        <span className="block text-[11px] leading-snug text-zinc-500">
                          {r.note}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

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
          {filtered.map((exercise) => {
            const rank = ifbbRankFor(exercise.muscle_group, exercise.name)
            return (
              <Card key={exercise.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-zinc-100">{exercise.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {exercise.primary_muscle ?? exercise.muscle_group}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {rank ? (
                    <Badge tone={rank.rank === 1 ? 'accent' : 'default'}>
                      <span className="mr-1 text-amber-300">★</span>
                      IFBB #{rank.rank}
                    </Badge>
                  ) : null}
                  <Badge tone="accent">{exercise.muscle_group}</Badge>
                  {exercise.equipment ? <Badge tone="muted">{exercise.equipment}</Badge> : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}