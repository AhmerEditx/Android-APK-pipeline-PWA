'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Card } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import { WorkoutForm, type InitialWorkoutData } from './workout-form'

export function WorkoutView({ initial }: { initial: InitialWorkoutData }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="space-y-6">
      {editing ? (
        <WorkoutForm exercises={initial.exercises.map((e) => e.exercise)} initial={initial} />
      ) : (
        <WorkoutSummary initial={initial} onEdit={() => setEditing(true)} />
      )}
    </div>
  )
}

function WorkoutSummary({ initial, onEdit }: { initial: InitialWorkoutData; onEdit: () => void }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSets = initial.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const volume = initial.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce(
        (s, set) => s + (set.weight_kg != null && set.reps != null ? set.weight_kg * set.reps : 0),
        0
      ),
    0
  )

  async function handleDelete() {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return
    setDeleting(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('workouts').delete().eq('id', initial.id)
    if (error) {
      setError(error.message)
      setDeleting(false)
      return
    }
    router.push('/history')
    router.refresh()
  }

  const today = new Date()
  const offset = today.getTimezoneOffset()
  const todayISO = new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {initial.date === todayISO ? 'Today' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onEdit}>
            Edit workout
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="accent">{initial.exercises.length} exercises</Badge>
          <Badge>{totalSets} sets</Badge>
          <Badge tone="muted">{formatNumber(volume)} kg moved</Badge>
        </div>

        {initial.notes ? (
          <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-300">
            {initial.notes}
          </p>
        ) : null}

        <div className="space-y-6">
          {initial.exercises.map((ex) => (
            <div key={ex.weId}>
              <p className="mb-2 font-semibold text-zinc-100">{ex.exercise.name}</p>
              {ex.sets.length === 0 ? (
                <p className="text-sm text-zinc-600">No sets logged.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-2 font-medium">Set</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Weight</th>
                        <th className="px-3 py-2 font-medium">Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set, i) => (
                        <tr key={set.id ?? i} className="border-t border-zinc-800">
                          <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                          <td className="px-3 py-2">
                            {set.is_warmup ? <Badge tone="muted">Warm-up</Badge> : <span className="text-zinc-400">Working</span>}
                          </td>
                          <td className="px-3 py-2 text-zinc-200">
                            {set.weight_kg != null ? `${formatNumber(set.weight_kg, 2)} kg` : '—'}
                          </td>
                          <td className="px-3 py-2 text-zinc-200">
                            {set.reps != null ? `${set.reps} reps` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}