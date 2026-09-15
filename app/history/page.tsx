import Link from 'next/link'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { DeleteWorkoutButton } from '@/components/delete-workout-button'
import { ClearHistoryButton } from '@/components/clear-history-button'
import { createClient, requireUser } from '@/lib/supabase/server'
import { formatDate, formatNumber } from '@/lib/utils'

type HistoryRow = {
  id: string
  date: string
  notes: string | null
  workout_exercises: Array<{
    sets: Array<{ weight_kg: number | null; reps: number | null }>
  }>
}

export const metadata = { title: 'History' }

export default async function HistoryPage() {
  const supabase = await createClient()
  await requireUser()

  const { data } = await supabase
    .from('workouts')
    .select('id, date, notes, workout_exercises(sets(weight_kg, reps))')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as HistoryRow[]

  return (
    <div>
      <PageHeader
        title="Workout history"
        description="Every session you've logged."
        action={
          rows.length > 0 ? <ClearHistoryButton /> : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          description="Your logged sessions will appear here."
          action={
            <Link href="/today" className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300">
              Go to today&apos;s plan
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((w) => {
            const exerciseCount = w.workout_exercises.length
            const setCount = w.workout_exercises.reduce((s, we) => s + we.sets.length, 0)
            const volume = w.workout_exercises.reduce(
              (s, we) =>
                s +
                we.sets.reduce(
                  (x, set) =>
                    x + (set.weight_kg != null && set.reps != null ? set.weight_kg * set.reps : 0),
                  0
                ),
              0
            )
            return (
              <Card key={w.id} className="p-4 transition-colors group-hover:border-zinc-700">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/history/${w.id}`} className="group min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">{formatDate(w.date)}</p>
                    {w.notes ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{w.notes}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-zinc-600">No notes</p>
                    )}
                  </Link>
                  <DeleteWorkoutButton workoutId={w.id} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{exerciseCount} exercises</Badge>
                  <Badge>{setCount} sets</Badge>
                  <Badge tone="muted">{formatNumber(volume)} kg</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}