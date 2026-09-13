import { PageHeader } from '@/components/ui'
import {
  ExerciseTrendChart,
  VolumeChart,
  WeightChart,
  WeightLogForm,
} from '@/components/progress-charts'
import { createClient, requireUser } from '@/lib/supabase/server'

type TrendRow = {
  date: string
  workout_exercises: Array<{
    exercises: { name: string } | null
    sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }>
  }>
}

export const metadata = { title: 'Progress' }

export default async function ProgressPage() {
  const supabase = await createClient()
  await requireUser()

  const [{ data: measurements }, { data: workoutRows }] = await Promise.all([
    supabase
      .from('body_measurements')
      .select('measured_on, weight_kg, body_fat_pct')
      .order('measured_on', { ascending: true }),
    supabase
      .from('workouts')
      .select('date, workout_exercises(exercises(name), sets(weight_kg, reps, is_warmup))'),
  ])

  const measurementPoints = (measurements ?? []).map((m) => ({
    measured_on: m.measured_on,
    weight_kg: m.weight_kg,
    body_fat_pct: m.body_fat_pct,
  }))

  const rows = (workoutRows ?? []) as unknown as TrendRow[]

  const strengthMap = new Map<string, Map<string, number>>()
  const volumeMap = new Map<string, number>()

  for (const workout of rows) {
    let workoutVolume = 0
    for (const we of workout.workout_exercises) {
      const name = we.exercises?.name
      let exerciseMax = 0
      for (const set of we.sets) {
        if (set.is_warmup || set.weight_kg == null) continue
        exerciseMax = Math.max(exerciseMax, set.weight_kg)
        if (set.reps != null && set.weight_kg != null) {
          workoutVolume += set.weight_kg * set.reps
        }
      }
      if (name && exerciseMax > 0) {
        const byDate = strengthMap.get(name) ?? new Map<string, number>()
        const prev = byDate.get(workout.date) ?? 0
        byDate.set(workout.date, Math.max(prev, exerciseMax))
        strengthMap.set(name, byDate)
      }
    }
    if (workoutVolume > 0) {
      volumeMap.set(workout.date, (volumeMap.get(workout.date) ?? 0) + workoutVolume)
    }
  }

  const trends = Array.from(strengthMap.entries())
    .map(([name, byDate]) => ({
      name,
      points: Array.from(byDate.entries())
        .map(([date, max_weight]) => ({ date, max_weight }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const volumeByDate = Array.from(volumeMap.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <PageHeader
        title="Progress"
        description="Track your body weight, volume, and strength over time."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <WeightLogForm />
        <WeightChart measurements={measurementPoints} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <VolumeChart volumeByDate={volumeByDate} />
        <ExerciseTrendChart trends={trends} />
      </div>
    </div>
  )
}