'use client'

import { useEffect } from 'react'
import type { Exercise } from '@/lib/supabase/types'
import { EXERCISE_MEDIA_BASE, mediaFor } from '@/lib/exercise-media'
import { ifbbRankFor } from '@/lib/ifbb-rankings'
import { Badge, Card } from '@/components/ui'
import { CloseIcon } from './icons'

export function ExerciseDemoModal({
  exercise,
  onClose,
}: {
  exercise: Exercise
  onClose: () => void
}) {
  const media = mediaFor(exercise.id)
  const rank = ifbbRankFor(exercise.muscle_group, exercise.name)

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

  const steps = (exercise.instructions ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${exercise.name} demo`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close demo"
        className="fixed right-4 top-4 z-10 rounded-full border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      <div
        className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="p-5 sm:p-6">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-zinc-500">
            How to do this exercise
          </p>
          <h2 className="mt-1 text-center text-xl font-bold text-zinc-50 sm:text-2xl">
            {exercise.name}
          </h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            <Badge tone="accent">{exercise.muscle_group}</Badge>
            {exercise.primary_muscle ? <Badge>{exercise.primary_muscle}</Badge> : null}
            {exercise.equipment ? <Badge tone="muted">{exercise.equipment}</Badge> : null}
            {rank ? (
              <Badge tone={rank.rank === 1 ? 'accent' : 'default'}>
                <span className="mr-1 text-amber-300">★</span>
                IFBB #{rank.rank}
              </Badge>
            ) : null}
          </div>

          {media ? (
            <img
              src={`${EXERCISE_MEDIA_BASE}${media.gif}`}
              alt={`${exercise.name} demo`}
              loading="lazy"
              width={512}
              height={512}
              className="mx-auto mt-5 max-h-[45vh] w-auto rounded-xl border border-zinc-800 bg-zinc-950 object-contain"
            />
          ) : null}

          {steps.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Instructions
              </p>
              <ol className="space-y-2">
                {steps.map((line, index) => (
                  <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-400/15 text-[11px] font-bold text-lime-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="mt-5 text-center text-sm text-zinc-500">No instructions available.</p>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Tap anywhere outside the card to close.
        </p>
      </div>
    </div>
  )
}