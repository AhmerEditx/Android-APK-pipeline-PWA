'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Card } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { REST, slotForDate, type ScheduleSlotList } from '@/lib/schedule'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

export function MonthCalendar({
  defaultYear,
  defaultMonth,
  doneDates,
  missedDates = [],
  today,
  doneToday,
  weekCount,
  motivation,
  schedule,
  startsOn,
}: {
  defaultYear: number
  defaultMonth: number
  doneDates: string[]
  missedDates?: string[]
  today: string
  doneToday: boolean
  weekCount: number
  motivation: { text: string; emoji: string }
  schedule?: ScheduleSlotList
  startsOn?: string
}) {
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [view, setView] = useState<'month' | 'year'>('month')
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [workouts, setWorkouts] = useState<DayWorkout[] | null>(null)

  const doneDateSet = useMemo(() => new Set(doneDates), [doneDates])
  const missedDateSet = useMemo(() => new Set(missedDates), [missedDates])

  function isRest(dateStr: string): boolean {
    if (!schedule || schedule.length === 0) return false
    if (startsOn && dateStr < startsOn) return false
    return slotForDate(schedule, startsOn ?? '', dateStr).kind === REST
  }

  const maxReached = view === 'year'
    ? year >= defaultYear
    : year === defaultYear && month === defaultMonth

  const yearCount = useMemo(
    () => doneDates.filter((d) => d.startsWith(`${year}-`)).length,
    [doneDates, year]
  )

  function monthCount(m: number): number {
    const prefix = `${year}-${pad(m + 1)}-`
    return doneDates.filter((d) => d.startsWith(prefix)).length
  }

  function isDone(y: number, m: number, day: number): boolean {
    const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`
    return doneDateSet.has(dateStr) || (dateStr === today && doneToday)
  }

  function isMissed(y: number, m: number, day: number): boolean {
    const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`
    return missedDateSet.has(dateStr) && !isDone(y, m, day)
  }

  function selectDate(y: number, m: number, day: number) {
    const date = `${y}-${pad(m + 1)}-${pad(day)}`
    if (date === selected) {
      setSelected(null)
      setWorkouts(null)
      return
    }
    setSelected(date)
    setLoading(true)
    setWorkouts(null)
  }

  function selectDay(day: number) {
    selectDate(year, month, day)
  }

  function openDayFromYear(m: number, day: number) {
    setYear(year)
    setMonth(m)
    setView('month')
    selectDate(year, m, day)
  }

  function goBack() {
    if (view === 'year') {
      setYear(year - 1)
      return
    }
    const prev = new Date(year, month - 1, 1)
    setYear(prev.getFullYear())
    setMonth(prev.getMonth())
  }

  function goForward() {
    if (maxReached) return
    if (view === 'year') {
      setYear(year + 1)
      return
    }
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
            aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goForward}
            aria-label="Next"
            disabled={maxReached}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-30"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setView(view === 'month' ? 'year' : 'month')}
            aria-label={view === 'month' ? 'Show full year' : 'Back to month view'}
            className="group flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-800"
          >
            {view === 'month' ? monthLabel : String(year)}
            <span
              className={`text-[9px] text-zinc-500 transition-transform group-hover:text-zinc-300 ${
                view === 'year' ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </button>
        </div>
        <span className="text-[10px] text-zinc-500">
          {view === 'year'
            ? `${yearCount} workout${yearCount === 1 ? '' : 's'} in ${year}`
            : `${weekCount} workout${weekCount === 1 ? '' : 's'} this week`}
        </span>
      </div>

      {view === 'year' ? (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, m) => {
              const dim = daysInMonth(year, m)
              const lead = firstWeekday(year, m)
              const count = monthCount(m)
              return (
                <div
                  key={m}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      {MONTH_NAMES[m]}
                    </p>
                    {count > 0 ? (
                      <span className="rounded-full bg-lime-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-lime-300">
                        {count}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-7 justify-items-center">
                    {WEEKDAYS.map((d, i) => (
                      <span key={`h${m}-${i}`} className="pb-0.5 text-[8px] font-semibold text-zinc-600">
                        {d}
                      </span>
                    ))}
                    {Array.from({ length: lead }).map((_, i) => (
                      <span key={`e${m}-${i}`} className="h-4" />
                    ))}
                    {Array.from({ length: dim }).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${year}-${pad(m + 1)}-${pad(day)}`
                      const done = isDone(year, m, day)
                      const missed = isMissed(year, m, day)
                      const rest = !done && !missed && isRest(dateStr)
                      const isToday = dateStr === today
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => openDayFromYear(m, day)}
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] leading-none transition-colors ${
                            done
                              ? 'bg-lime-400 font-bold text-zinc-950'
                              : isToday
                                ? 'font-bold text-lime-400 ring-1 ring-lime-400/60'
                                : missed
                                  ? 'font-bold text-red-400 ring-1 ring-red-500/70'
                                  : rest
                                    ? 'bg-zinc-800 text-zinc-500'
                                    : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-lime-400" /> Trained
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-lime-400/60" /> Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-red-500/70" /> Missed training day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" /> Rest
            </span>
            <span className="ml-auto">
              Tap a day to open that date.
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-7 justify-items-center">
          {WEEKDAYS.map((d, i) => (
            <span key={`h${i}`} className="pb-1 text-[10px] font-semibold text-zinc-500">
              {d}
            </span>
          ))}
          {Array.from({ length: firstWeekday(year, month) }).map((_, i) => (
            <span key={`e${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
            const done = doneDateSet.has(dateStr) || (dateStr === today && doneToday)
            const missed = missedDateSet.has(dateStr) && !done
            const rest = !done && !missed && isRest(dateStr)
            const isSelected = dateStr === selected
            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                aria-label={`${MONTH_NAMES_FULL[month]} ${day}`}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs transition-colors ${
                  done
                    ? 'bg-lime-400 font-semibold text-zinc-950'
                    : isSelected
                      ? 'bg-zinc-100 font-semibold text-zinc-950'
                      : dateStr === today
                        ? 'font-bold text-lime-400 ring-1 ring-lime-400/60'
                        : missed
                          ? 'font-bold text-red-400 ring-1 ring-red-500/70'
                          : rest
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {day}
                {dateStr === today && !done && (
                  <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-lime-400" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {view === 'month' ? (
        selected ? (
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
        )
      ) : null}
    </Card>
  )
}