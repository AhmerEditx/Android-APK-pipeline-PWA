import { notFound } from 'next/navigation'
import { WorkoutView } from '@/components/workout-view'
import type { InitialWorkoutData } from '@/components/workout-form'
import { createClient, requireUser } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

type WorkoutDetailRow = {
  id: string
  date: string
  notes: string | null
  workout_exercises: Array<{
    id: string
    exercises: {
      id: string
      name: string
      muscle_group: string
      equipment: string | null
      primary_muscle: string | null
      instructions: string | null
    }
    sets: Array<{
      id: string
      set_number: number
      weight_kg: number | null
      reps: number | null
      is_warmup: boolean
    }>
  }>
}

export const metadata = { title: 'Workout' }

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  await requireUser()

  const { data: workout } = await supabase
    .from('workouts')
    .select('id, date, notes, workout_exercises(exercises(*), sets(*))')
    .eq('id', id)
    .maybeSingle()

  if (!workout) notFound()

  const row = workout as unknown as WorkoutDetailRow

  const initial: InitialWorkoutData = {
    id: row.id,
    date: row.date,
    notes: row.notes,
    exercises: row.workout_exercises.map((we) => ({
      weId: we.id,
      exercise: {
        id: we.exercises.id,
        name: we.exercises.name,
        muscle_group: we.exercises.muscle_group,
        equipment: we.exercises.equipment,
        primary_muscle: we.exercises.primary_muscle,
        instructions: we.exercises.instructions,
      },
      sets: [...we.sets].sort((a, b) => a.set_number - b.set_number),
    })),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {formatDate(initial.date)}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {initial.exercises.length} exercises · total sets recorded
        </p>
      </div>
      <WorkoutView initial={initial} />
    </div>
  )
}