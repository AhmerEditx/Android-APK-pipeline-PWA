import { notFound } from 'next/navigation'
import { Badge, Card, PageHeader } from '@/components/ui'
import { StartPlanButton } from '@/components/start-plan-button'
import { PlanScheduleEditor } from '@/components/plan-schedule-editor'
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

        {days.map((day) => {
          const exercises = [...day.plan_day_exercises].sort((a, b) => a.position - b.position)
          return (
            <Card key={day.id} className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Badge tone="accent">Day {day.position}</Badge>
                <h2 className="font-semibold text-zinc-50">{day.name}</h2>
              </div>
              <div className="divide-y divide-zinc-800">
                {exercises.map((pde) => (
                  <div
                    key={pde.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">{pde.position}.</span>
                      <span className="font-medium text-zinc-100">
                        {pde.exercises?.name ?? 'Unknown exercise'}
                      </span>
                      {pde.exercises ? (
                        <Badge tone="muted">{pde.exercises.muscle_group}</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Badge>{pde.prescribed_sets} sets</Badge>
                      <span>
                        {pde.prescribed_reps ? `${pde.prescribed_reps} reps` : '\u00A0'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}