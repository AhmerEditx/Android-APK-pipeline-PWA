import Link from 'next/link'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { TodayChecklist } from '@/components/today-checklist'
import type { TodaysExercises } from '@/components/today-checklist'
import { createClient, requireUser } from '@/lib/supabase/server'
import { REST, restSchedule } from '@/lib/schedule'
import { addDays, daysBetween, localDateISO } from '@/lib/utils'

type ActivePlanRow = {
  id: string
  starts_on: string
  plan_id: string
  plans: {
    id: string
    name: string
    days_count: number
    description: string | null
  }
}

type PlanDayRow = {
  id: string
  name: string
  position: number
  plan_day_exercises: Array<{
    id: string
    position: number
    prescribed_sets: number
    prescribed_reps: string | null
    target_weight: string | null
    exercises: { id: string; name: string; muscle_group: string } | null
  }>
}

type LastAttemptRow = {
  date: string
  workout_exercises: Array<{
    exercise_id: string
    sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }>
  }>
}

export const metadata = { title: "Today's Workout" }

export default async function TodayPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const { data: active } = await supabase
    .from('user_plans')
    .select('id, starts_on, plan_id, plans(id, name, days_count, description)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (!active) {
    return (
      <div>
        <PageHeader title="Today's workout" description="Check off your prescribed session." />
        <EmptyState
          title="No active plan"
          description="Choose a plan from the library to start your weekly split, then today's workout will appear here."
          action={
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
            >
              Browse plans
            </Link>
          }
        />
      </div>
    )
  }

  const row = active as unknown as ActivePlanRow
  const today = localDateISO()
  const daysElapsed = Math.max(daysBetween(row.starts_on, today), 0)
  const schedule = restSchedule(row.plans.days_count)
  const slotIndex = daysElapsed % schedule.length
  const slot = schedule[slotIndex]

  if (slot === REST) {
    const nextPosition = schedule[(slotIndex + 1) % schedule.length] as number
    const { data: nextDay } = await supabase
      .from('plan_days')
      .select('name, position')
      .eq('plan_id', row.plans.id)
      .eq('position', nextPosition)
      .maybeSingle()
    const nextName = (nextDay as unknown as { name: string } | null)?.name

    return (
      <div>
        <PageHeader
          title="Rest day"
          description={`${row.plans.name} · recover before the next session.`}
        />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Rest</Badge>
            <Badge>{nextName ? `Next: Day ${nextPosition} · ${nextName}` : 'Rest day'}</Badge>
          </div>
          <h2 className="mt-4 text-xl font-bold text-zinc-50">Rest &amp; recover today.</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {nextName
              ? `Your next session is Day ${nextPosition} of ${row.plans.days_count} · ${nextName}.`
              : `Day ${nextPosition} of ${row.plans.days_count} is next.`}{' '}
            Your next workout will appear here automatically.
          </p>
          <Link
            href="/workouts/new"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
          >
            Log a workout anyway
          </Link>
        </div>
      </div>
    )
  }

  const position = slot

  const [{ data: planDay }, { data: lastAttempts }] = await Promise.all([
    supabase
      .from('plan_days')
      .select('id, name, position, plan_day_exercises(*, exercises(id, name, muscle_group))')
      .eq('plan_id', row.plans.id)
      .eq('position', position)
      .maybeSingle(),
    supabase
      .from('workouts')
      .select('date, workout_exercises(exercise_id, sets(weight_kg, reps, is_warmup))')
      .eq('user_id', user.id)
      .lt('date', today)
      .gte('date', addDays(today, -13))
      .order('date', { ascending: false })
      .limit(30),
  ])

  if (!planDay) {
    return (
      <div>
        <PageHeader title="Today's workout" description="Check off your prescribed session." />
        <EmptyState
          title={`Nothing scheduled for day ${position}`}
          description={`"${row.plans.name}" has ${row.plans.days_count} days — day ${position} is missing. Start the plan again to reset the cycle.`}
        />
      </div>
    )
  }

  const day = planDay as unknown as PlanDayRow
  const exercises = [...day.plan_day_exercises].sort((a, b) => a.position - b.position)

  const attempts = (lastAttempts ?? []) as unknown as LastAttemptRow[]
  const lastByExercise = new Map<
    string,
    { date: string; sets: Array<{ weight_kg: number | null; reps: number | null; is_warmup: boolean }> }
  >()
  for (const workout of attempts) {
    for (const we of workout.workout_exercises) {
      if (!lastByExercise.has(we.exercise_id)) {
        lastByExercise.set(we.exercise_id, { date: workout.date, sets: we.sets })
      }
    }
  }

  const todaysExercises: TodaysExercises = exercises.map((pde) => {
    const last = pde.exercises ? lastByExercise.get(pde.exercises.id) : undefined
    return {
      pdeId: pde.id,
      exerciseId: pde.exercises?.id ?? '',
      name: pde.exercises?.name ?? 'Unknown exercise',
      muscleGroup: pde.exercises?.muscle_group ?? '',
      prescribedSets: pde.prescribed_sets,
      prescribedReps: pde.prescribed_reps,
      targetWeight: pde.target_weight,
      last: last
        ? { date: last.date, sets: last.sets.filter((set) => !set.is_warmup) }
        : null,
    }
  })

  const setsToday = todaysExercises.reduce((sum, ex) => sum + ex.prescribedSets, 0)

  return (
    <div>
      <PageHeader
        title="Today's workout"
        description={`${row.plans.name} · Day ${position} of ${row.plans.days_count}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="accent">{day.name}</Badge>
            <Badge>{setsToday} sets</Badge>
          </div>
        }
      />
      <TodayChecklist
        planDayId={day.id}
        dayName={day.name}
        today={today}
        exercises={todaysExercises}
      />
    </div>
  )
}