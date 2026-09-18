import { PageHeader } from '@/components/ui'
import { AchievementsGrid } from '@/components/achievements-grid'
import { createClient, requireUser } from '@/lib/supabase/server'
import { getAchievements } from '@/lib/achievements'
import { computeWorkoutStreaks } from '@/lib/utils'

export const metadata = { title: 'Achievements' }

type SetAggRow = {
  plan_day_id: string | null
  workout_exercises: Array<{
    exercises: { name: string | null; muscle_group: string } | null
    sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }>
  }>
}

export default async function AchievementsPage() {
  await requireUser()
  const supabase = await createClient()
  const [
    { count },
    { data: dateRows },
    { data: setRows },
    { count: measurementCount },
    { count: planCount },
    { data: planDateRows },
  ] = await Promise.all([
    supabase.from('workouts').select('id', { count: 'exact', head: true }),
    supabase.from('workouts').select('date').order('date', { ascending: false }).limit(500),
    supabase
      .from('workouts')
      .select('plan_day_id, workout_exercises(exercises(name, muscle_group), sets(weight_kg, reps, is_warmup))'),
    supabase.from('body_measurements').select('id', { count: 'exact', head: true }),
    supabase.from('user_plans').select('id', { count: 'exact', head: true }),
    supabase.from('workouts').select('date').not('plan_day_id', 'is', null),
  ])

  const longestStreak = computeWorkoutStreaks((dateRows ?? []).map((r) => r.date)).longest

  let volumeKg = 0
  let totalSets = 0
  const exercises = new Set<string>()
  const muscles = new Set<string>()
  for (const w of (setRows ?? []) as unknown as SetAggRow[]) {
    for (const we of w.workout_exercises) {
      const name = we.exercises?.name
      const muscle = we.exercises?.muscle_group
      if (name) exercises.add(name)
      if (muscle) muscles.add(muscle)
      for (const s of we.sets) {
        if (s.is_warmup) continue
        totalSets++
        if (s.weight_kg != null && s.reps != null) {
          volumeKg += s.weight_kg * s.reps
        }
      }
    }
  }

  const achievements = getAchievements({
    workouts: count ?? 0,
    longestStreak,
    volumeKg,
    totalSets,
    distinctMuscles: muscles.size,
    distinctExercises: exercises.size,
    measurements: measurementCount ?? 0,
    plansStarted: planCount ?? 0,
    planDaysDone: (planDateRows ?? []).length,
  })

  return (
    <div>
      <PageHeader
        title="Achievements"
        description="Milestones for workouts logged, streaks, volume and consistency."
      />
      <AchievementsGrid achievements={achievements} />
    </div>
  )
}