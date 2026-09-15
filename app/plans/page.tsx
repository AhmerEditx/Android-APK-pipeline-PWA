import Link from 'next/link'
import { Badge, Card, PageHeader } from '@/components/ui'
import { createClient, requireUser } from '@/lib/supabase/server'
import type { Plan } from '@/lib/supabase/types'

type PlanRow = Plan & {
  plan_days: Array<{ plan_day_exercises: Array<{ id: string }>; name: string }>
}

export const metadata = { title: 'Training Plans' }

export default async function PlansPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const [{ data }, { data: activePlan }] = await Promise.all([
    supabase
      .from('plans')
      .select('*, plan_days(name, plan_day_exercises(id))')
      .eq('is_public', true)
      .order('days_count'),
    supabase
      .from('user_plans')
      .select('plan_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
  ])

  const rows = (data ?? []) as unknown as PlanRow[]

  return (
    <div>
      <PageHeader
        title="Training plans"
        description="Pick a weekly split, start it, and check off each day from the Today page."
      />

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-200">No plans yet</p>
          <p className="max-w-sm text-sm text-zinc-500">
            Plans are seeded by the database migration. Reply to this message if none show up.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((plan) => {
            const days = [...plan.plan_days].sort((a, b) => {
              const aPos = a as { position?: number }
              const bPos = b as { position?: number }
              return (aPos.position ?? 0) - (bPos.position ?? 0)
            })
            const exerciseCount = plan.plan_days.reduce(
              (sum, day) => sum + day.plan_day_exercises.length,
              0
            )
            const isActive = activePlan?.plan_id === plan.id
            return (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="group"
              >
                <Card className="h-full p-5 transition-colors group-hover:border-zinc-700">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-zinc-50">{plan.name}</h2>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {isActive ? <Badge>Active</Badge> : null}
                      <Badge tone="accent">{plan.days_count} days</Badge>
                    </div>
                  </div>
                  {plan.description ? (
                    <p className="mt-1.5 text-sm text-zinc-500">{plan.description}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {days.map((day) => (
                      <Badge key={day.name} tone="muted">
                        {day.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-zinc-600">
                    {exerciseCount} exercises across {plan.days_count} sessions
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}