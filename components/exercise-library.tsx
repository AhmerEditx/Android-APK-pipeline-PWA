'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/lib/supabase/types'
import { IFBB_TOP3, ifbbRankFor } from '@/lib/ifbb-rankings'
import { EXERCISE_MEDIA_BASE, mediaFor } from '@/lib/exercise-media'
import { Badge, Card, EmptyState, Input, PageHeader } from '@/components/ui'

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [subFilter, setSubFilter] = useState<string | null>(null)
  const [showRanks, setShowRanks] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const muscleGroups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(),
    [exercises]
  )

  const subMuscles = useMemo(() => {
    if (!muscleFilter) return []
    const subs = Array.from(
      new Set(
        exercises
          .filter((e) => e.muscle_group === muscleFilter)
          .map((e) => e.primary_muscle)
          .filter((m): m is string => Boolean(m))
      )
    )
    return subs.sort()
  }, [exercises, muscleFilter])

  function selectGroup(group: string | null) {
    setMuscleFilter(group)
    setSubFilter(null)
  }

  const filtered = useMemo(() => {
    return exercises
      .filter((e) => (muscleFilter ? e.muscle_group === muscleFilter : true))
      .filter((e) => (subFilter ? e.primary_muscle === subFilter : true))
      .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [exercises, muscleFilter, subFilter, query])

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

      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectGroup(null)}
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
            onClick={() => selectGroup(muscleFilter === group ? null : group)}
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

      {muscleFilter && subMuscles.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Focused muscles
            </span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>
          <div className="flex flex-wrap gap-2">
            {subMuscles.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubFilter(subFilter === sub ? null : sub)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  subFilter === sub
                    ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="No exercises found" description="Try a different search or muscle group." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((exercise) => {
            const rank = ifbbRankFor(exercise.muscle_group, exercise.name)
            const media = mediaFor(exercise.id)
            const open = openId === exercise.id
            return (
              <Card key={exercise.id} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : exercise.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-zinc-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {media ? (
                      <img
                        src={`${EXERCISE_MEDIA_BASE}${media.gif}`}
                        alt=""
                        loading="lazy"
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium leading-tight text-zinc-100">{exercise.name}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {exercise.primary_muscle ?? exercise.muscle_group}
                      </p>
                    </div>
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
                </button>

                {open ? (
                  <div className="border-t border-zinc-800/80 bg-zinc-900/40 p-4">
                    {media ? (
                      <img
                        src={`${EXERCISE_MEDIA_BASE}${media.gif}`}
                        alt={`${exercise.name} demo`}
                        loading="lazy"
                        width={120}
                        height={120}
                        className="mb-3 h-28 w-28 rounded-lg border border-zinc-800 bg-zinc-950 object-cover"
                      />
                    ) : null}
                    {exercise.instructions ? (
                      <p className="text-sm leading-relaxed text-zinc-300">
                        {exercise.instructions}
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-500">No instructions available.</p>
                    )}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}