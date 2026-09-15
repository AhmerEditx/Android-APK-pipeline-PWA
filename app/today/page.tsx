import Link from 'next/link'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { TodayChecklist } from '@/components/today-checklist'
import type { TodaysExercises } from '@/components/today-checklist'
import { TodayExerciseEditor } from '@/components/today-exercise-editor'
import type { CatalogExercise } from '@/components/plan-exercises-editor'
import { StopPlanButton } from '@/components/stop-plan-button'
import {
  effectiveExercisesForDay,
  type TemplatePlanDay,
  type UserPlanExerciseRow,
} from '@/lib/plan-exercises'
import { createClient, requireUser } from '@/lib/supabase/server'
import { REST, defaultScheduleForDays, nextTrainingSlot, type ScheduleSlotList } from '@/lib/schedule'
import { addDays, daysBetween, localDateISO, weekdayIndex } from '@/lib/utils'

type ActivePlanRow = {
  id: string
  starts_on: string
  plan_id: string
  schedule: ScheduleSlotList | null
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
    .select('id, starts_on, plan_id, schedule, plans(id, name, days_count, description)')
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

  const [
    { data: planDaysData },
    { data: userExData },
    { data: lastAttempts },
    { data: catalogData },
  ] = await Promise.all([
    supabase
      .from('plan_days')
      .select('id, name, position, plan_day_exercises(*, exercises(id, name, muscle_group))')
      .eq('plan_id', row.plans.id)
      .order('position', { ascending: true }),
    supabase
      .from('user_plan_exercises')
      .select(
        'id, plan_day_id, exercise_id, position, prescribed_sets, prescribed_reps, target_weight, exercises(id, name, muscle_group)'
      )
      .eq('user_plan_id', row.id),
    supabase
      .from('workouts')
      .select('date, workout_exercises(exercise_id, sets(weight_kg, reps, is_warmup))')
      .eq('user_id', user.id)
      .lt('date', today)
      .gte('date', addDays(today, -13))
      .order('date', { ascending: false })
      .limit(30),
    supabase.from('exercises').select('id, name, muscle_group, equipment, primary_muscle').order('name'),
  ])

  const planDayRows = (planDaysData ?? []) as unknown as PlanDayRow[]
  const dayById = new Map(planDayRows.map((d) => [d.id, d]))
  const userRows = (userExData ?? []) as unknown as UserPlanExerciseRow[]
  const customized = userRows.length > 0
  const templateByDay: Record<string, ReturnType<typeof effectiveExercisesForDay>> = {}
  for (const planDay of planDayRows) {
    templateByDay[planDay.id] = effectiveExercisesForDay(
      planDay as unknown as TemplatePlanDay,
      [],
      false
    )
  }

  const saved = row.schedule
  const schedule: ScheduleSlotList =
    saved && saved.length > 0 ? saved : defaultScheduleForDays(planDayRows, row.plans.days_count)

  if (schedule.length === 0) {
    return (
      <div>
        <PageHeader title="Today's workout" description="Check off your prescribed session." />
        <EmptyState
          title="No sessions scheduled"
          description={`"${row.plans.name}" has no schedule yet. Open the plan and customise your cycle.`}
        />
      </div>
    )
  }

  const slotIndex =
    schedule.length === 7 ? weekdayIndex(today) : daysElapsed % schedule.length
  const slot = schedule[slotIndex]

  if (slot.kind === REST) {
    const next = nextTrainingSlot(schedule, slotIndex)
    const nextLabel =
      next && next.slot.kind === 'day'
        ? `Day ${dayById.get(next.slot.planDayId)?.position ?? ''} · ${dayById.get(next.slot.planDayId)?.name ?? 'next session'}`
        : next?.slot.kind === 'custom'
          ? next.slot.name
          : undefined

    return (
      <div>
        <PageHeader
          title="Rest day"
          description={`${row.plans.name} · recover before the next session.`}
          action={<StopPlanButton userPlanId={row.id} compact />}
        />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Rest</Badge>
            {nextLabel ? <Badge>Next: {nextLabel}</Badge> : null}
          </div>
          <h2 className="mt-4 text-xl font-bold text-zinc-50">Rest &amp; recover today.</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {nextLabel ? `Your next session is ${nextLabel}. ` : ''}
            Your next workout will appear here automatically.
          </p>
          <Link
            href="/exercises"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
          >
            Browse the exercise library
          </Link>
        </div>
      </div>
    )
  }

  if (slot.kind === 'custom') {
    return (
      <div>
        <PageHeader title="Today's workout" description={`${row.plans.name} · ${slot.name}`} action={<StopPlanButton userPlanId={row.id} compact />} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Badge tone="accent">{slot.name}</Badge>
            <Badge>No preset exercises</Badge>
          </div>
          <h2 className="mt-4 text-xl font-bold text-zinc-50">{slot.name} — it&apos;s your call.</h2>
          <p className="mt-1 text-sm text-zinc-500">
            This is an extra working day you added to your schedule. Log whatever feels right.
          </p>
          <Link
            href="/exercises"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300"
          >
            Refer to the exercise library
          </Link>
        </div>
      </div>
    )
  }

  const day = dayById.get(slot.planDayId)
  if (!day) {
    return (
      <div>
        <PageHeader title="Today's workout" description="Check off your prescribed session." />
        <EmptyState
          title="Session unavailable"
          description={`"${row.plans.name}" is missing a session in your schedule. Open the plan and reset the cycle.`}
        />
      </div>
    )
  }

  const exercises = effectiveExercisesForDay(
    day as unknown as TemplatePlanDay,
    userRows,
    customized
  )

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

  const todaysExercises: TodaysExercises = exercises.map((ex) => {
    const last = ex.exerciseId ? lastByExercise.get(ex.exerciseId) : undefined
    return {
      pdeId: ex.refId,
      exerciseId: ex.exerciseId,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      prescribedSets: ex.prescribedSets,
      prescribedReps: ex.prescribedReps,
      targetWeight: ex.targetWeight,
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
        description={`${row.plans.name} · ${day.name}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="accent">{day.name}</Badge>
            <Badge>{setsToday} sets</Badge>
            <StopPlanButton userPlanId={row.id} compact />
          </div>
        }
      />
      <TodayExerciseEditor
        userPlanId={row.id}
        planDayId={day.id}
        dayName={day.name}
        currentExercises={exercises}
        templateByDay={templateByDay}
        catalog={(catalogData ?? []) as unknown as CatalogExercise[]}
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