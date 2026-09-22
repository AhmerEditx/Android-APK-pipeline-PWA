import { ExerciseLibrary } from '@/components/exercise-library'
import type { AddTarget } from '@/components/exercise-add-sheet'
import { createClient, requireUser } from '@/lib/supabase/server'
import { defaultScheduleForDays, type ScheduleSlotList } from '@/lib/schedule'
import { daysBetween, localDateISO, weekdayIndex } from '@/lib/utils'

export const metadata = { title: 'Exercises' }

type ActivePlanRow = {
  id: string
  starts_on: string
  schedule: ScheduleSlotList | null
  plans: { id: string; name: string; days_count: number }
}

type PlanDayRow = {
  id: string
  name: string
  position: number
  plan_day_exercises: Array<{
    exercise_id: string | null
    position: number
    prescribed_sets: number
    prescribed_reps: string | null
  }>
}

export default async function ExercisesPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const all: Array<Record<string, unknown>> = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('muscle_group')
      .order('name')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    all.push(...data)
    from += data.length
    if (data.length < 1000) break
  }

  let addTarget: AddTarget | null = null

  const { data: active } = await supabase
    .from('user_plans')
    .select('id, starts_on, schedule, plans(id, name, days_count)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (active) {
    const row = active as unknown as ActivePlanRow
    const { data: planDaysData } = await supabase
      .from('plan_days')
      .select('id, name, position, plan_day_exercises(exercise_id, position, prescribed_sets, prescribed_reps)')
      .eq('plan_id', row.plans.id)
      .order('position', { ascending: true })

    const planDays = ((planDaysData ?? []) as unknown as PlanDayRow[]).sort(
      (a, b) => a.position - b.position
    )

    const today = localDateISO()
    const daysElapsed = Math.max(daysBetween(row.starts_on, today), 0)
    const saved = row.schedule
    const schedule: ScheduleSlotList =
      saved && saved.length > 0 ? saved : defaultScheduleForDays(planDays, row.plans.days_count)
    const slotIndex = schedule.length === 7 ? weekdayIndex(today) : daysElapsed % schedule.length
    const slot = schedule[slotIndex]
    const todayPlanDayId = slot.kind === 'day' ? slot.planDayId : null

    addTarget = {
      userPlanId: row.id,
      planName: row.plans.name,
      todayPlanDayId,
      days: planDays.map((d) => ({ id: d.id, name: d.name, position: d.position })),
      templateDays: planDays.map((d) => ({
        id: d.id,
        exercises: [...d.plan_day_exercises]
          .sort((a, b) => a.position - b.position)
          .filter((e) => e.exercise_id)
          .map((e) => ({
            exercise_id: e.exercise_id as string,
            position: e.position,
            prescribed_sets: e.prescribed_sets,
            prescribed_reps: e.prescribed_reps,
          })),
      })),
    }
  }

  return <ExerciseLibrary exercises={all as never} addTarget={addTarget} />
}