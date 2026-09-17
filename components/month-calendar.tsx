'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Card } from '@/components/ui'
import { formatDate } from '@/lib/utils'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type DayWorkout = {
  id: string
  notes: string | null
  workout_exercises: Array<{
    exercises: { name: string } | null
    sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }>
  }>
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function MonthCalendar({
  defaultYear,
  defaultMonth,
  doneDates,
  today,
  doneToday,
  weekCount,
  motivation,
}: {
  defaultYear: number
  defaultMonth: number
  doneDates: string[]
  today: string
  doneToday: boolean
  weekCount: number
  motivation: { text: string; emoji: string }
}) {
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [workouts, setWorkouts] = useState<DayWorkout[] | null>(null)

  const maxReached = year === defaultYear && month === defaultMonth
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function selectDay(day: number) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    if (date === selected) return
    setSelected(date)
    setLoading(true)
    setWorkouts(null)
  }

  function goBack() {
    const prev = new Date(year, month - 1, 1)
    setYear(prev.getFullYear())
    setMonth(prev.getMonth())
  }

  function goForward() {
    if (maxReached) return
    const next = new Date(year, month + 1, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const date = selected

    async function load() {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        if (!cancelled) {
          setLoading(false)
          setWorkouts([])
        }
        return
      }
      const { data, error } = await supabase
        .from('workouts')
        .select('id, notes, workout_exercises(exercises(name), sets(weight_kg, reps, is_warmup))')
        .eq('user_id', auth.user.id)
        .eq('date', date)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setLoading(false)
        setWorkouts(error ? [] : (data ?? []))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [selected])

  const monthLabel = new Date(year, month, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <Card className="mb-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goForward}
            aria-label="Next month"
            disabled={maxReached}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-30"
          >
            ›
          </button>
          <p className="text-sm font-bold text-zinc-100">{monthLabel}</p>
        </div>
        <span className="text-[10px] text-zinc-500">
          {weekCount} workout{weekCount === 1 ? '' : 's'} this week
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 justify-items-center">
        {WEEKDAYS.map((d, i) => (
          <span key={`h${i}`} className="pb-1 text-[10px] font-semibold text-zinc-500">
            {d}
          </span>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <span key={`e${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const done = doneDates.includes(dateStr) || (dateStr === today && doneToday)
          const isToday = dateStr === today
          const isSelected = dateStr === selected
          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              aria-label={`${monthLabel} ${day}`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs transition-colors ${
                done
                  ? 'bg-lime-400 font-semibold text-zinc-950'
                  : isSelected
                    ? 'bg-zinc-100 font-semibold text-zinc-950'
                    : isToday
                      ? 'font-bold text-lime-400 ring-1 ring-lime-400/60'
                      : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {day}
              {isToday && !done && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-lime-400" />
              )}
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {formatDate(selected)}
            </p>
            {workouts && workouts.length > 0 && (
              <Badge tone="accent">
                {workouts.length} workout{workouts.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>

          {loading ? (
            <p className="py-2 text-sm text-zinc-500">Loading…</p>
          ) : workouts && workouts.length > 0 ? (
            <div className="space-y-2">
              {workouts.map((w) => {
                const totalSets = w.workout_exercises.reduce(
                  (sum, we) => sum + we.sets.filter((s) => !s.is_warmup).length,
                  0
                )
                const volume = w.workout_exercises.reduce(
                  (sum, we) =>
                    sum +
                    we.sets
                      .filter((s) => !s.is_warmup)
                      .reduce((acc, s) => acc + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
                  0
                )
                return (
                  <div key={w.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100">Session</p>
                      <Badge tone="muted">{totalSets} sets</Badge>
                      {volume > 0 && <Badge tone="muted">{Math.round(volume)} kg volume</Badge>}
                    </div>
                    {w.notes ? (
                      <p className="mt-1.5 text-xs text-zinc-500">&ldquo;{w.notes}&rdquo;</p>
                    ) : null}
                    <div className="mt-2 space-y-1.5">
                      {w.workout_exercises.map((we, idx) => {
                        const sets = we.sets.filter((s) => !s.is_warmup)
                        return (
                          <div
                            key={idx}
                            className="flex items-baseline justify-between gap-3 text-xs"
                          >
                            <span className="font-medium text-zinc-300">
                              {we.exercises?.name ?? 'Exercise'}
                            </span>
                            <span className="text-right text-zinc-500">
                              {sets.length > 0
                                ? sets
                                    .map(
                                      (s) =>
                                        `${s.weight_kg != null ? Math.round(s.weight_kg) : '—'}×${s.reps ?? '—'}`
                                    )
                                    .join(' · ')
                                : 'no sets'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : workouts ? (
            <p className="py-2 text-sm text-zinc-500">Rest day — no workout logged.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[10px] leading-snug text-zinc-500">
          {motivation.emoji} {motivation.text} — Tap a date to see that day&apos;s progress.
        </p>
      )}
    </Card>
  )
}