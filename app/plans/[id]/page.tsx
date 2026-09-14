import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { StartPlanButton } from '@/components/start-plan-button'
import { PlanScheduleEditor } from '@/components/plan-schedule-editor'
import { PlanExercisesEditor, type CatalogExercise } from '@/components/plan-exercises-editor'
import {
  effectiveExercisesForDay,
  type TemplatePlanDay,
  type UserPlanExerciseRow,
} from '@/lib/plan-exercises'
import { createClient, requireUser } from '@/lib/supabase/server'

type PlanDetailRow = {
  id: string
  name: string
  description: string | null
  days_count: number
  plan_days: Array<{
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
  }>
}

export const metadata = { title: 'Plan' }

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  await requireUser()

  const { data: plan } = await supabase
    .from('plans')
    .select('*, plan_days(*, plan_day_exercises(*, exercises(id, name, muscle_group)))')
    .eq('id', id)
    .maybeSingle()

  if (!plan) notFound()

  const row = plan as unknown as PlanDetailRow
  const days = [...row.plan_days].sort((a, b) => a.position - b.position)

  const { data: active } = await supabase
    .from('user_plans')
    .select('id, starts_on, schedule')
    .eq('plan_id', row.id)
    .eq('active', true)
    .maybeSingle()

  const [{ data: userExData }, { data: catalogData }] = await Promise.all([
    active
      ? supabase
          .from('user_plan_exercises')
          .select(
            'id, plan_day_id, exercise_id, position, prescribed_sets, prescribed_reps, target_weight, exercises(id, name, muscle_group)'
          )
          .eq('user_plan_id', active.id)
      : Promise.resolve({ data: null }),
    supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment, primary_muscle')
      .order('name'),
  ])

  const userRows = (userExData ?? []) as unknown as UserPlanExerciseRow[]
  const customized = userRows.length > 0

  const templateByDay: Record<string, ReturnType<typeof effectiveExercisesForDay>> = {}
  const currentByDay: Record<string, ReturnType<typeof effectiveExercisesForDay>> = {}
  for (const day of days) {
    templateByDay[day.id] = effectiveExercisesForDay(day as unknown as TemplatePlanDay, [], false)
    currentByDay[day.id] = effectiveExercisesForDay(
      day as unknown as TemplatePlanDay,
      userRows,
      customized
    )
  }

  return (
    <div>
      <PageHeader
        title={row.name}
        description={row.description ?? undefined}
        action={<StartPlanButton planId={row.id} startsOn={active?.starts_on ?? undefined} />}
      />

      <div className="space-y-6">
        <PlanScheduleEditor
          userPlanId={active?.id ?? null}
          planDays={days.map((d) => ({ id: d.id, position: d.position, name: d.name }))}
          planDaysCount={row.days_count}
          initialSchedule={active?.schedule ?? null}
        />

        <PlanExercisesEditor
          userPlanId={active?.id ?? null}
          days={days.map((d) => ({ id: d.id, position: d.position, name: d.name }))}
          currentByDay={currentByDay}
          templateByDay={templateByDay}
          catalog={(catalogData ?? []) as unknown as CatalogExercise[]}
        />
      </div>
    </div>
  )
}