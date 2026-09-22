import { CustomPlanBuilder } from '@/components/custom-plan-builder'
import type { CatalogExercise } from '@/components/plan-exercises-editor'
import { PageHeader } from '@/components/ui'
import { createClient, requireUser } from '@/lib/supabase/server'
import { fetchExerciseCatalog } from '@/lib/exercise-catalog'

export const metadata = { title: 'Create a Plan' }

type TemplateRow = {
  id: string
  name: string
  days_count: number
  plan_days: Array<{
    name: string
    position: number
    plan_day_exercises: Array<{
      position: number
      prescribed_sets: number
      prescribed_reps: string | null
      exercises: { id: string; name: string; muscle_group: string } | null
    }>
  }>
}

export default async function NewPlanPage() {
  const supabase = await createClient()
  await requireUser()

  const [{ data: templatesData }, catalog] = await Promise.all([
    supabase
      .from('plans')
      .select(
        'id, name, days_count, plan_days(name, position, plan_day_exercises(position, prescribed_sets, prescribed_reps, exercises(id, name, muscle_group)))'
      )
      .eq('is_public', true)
      .order('days_count'),
    fetchExerciseCatalog(supabase),
  ])

  const templates = ((templatesData ?? []) as unknown as TemplateRow[])
    .filter((t) => t.plan_days.length > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      days_count: t.days_count,
      days: [...t.plan_days]
        .sort((a, b) => a.position - b.position)
        .map((d) => ({
          name: d.name,
          exercises: [...d.plan_day_exercises]
            .sort((a, b) => a.position - b.position)
            .map((pde) => ({
              exercise_id: pde.exercises?.id ?? '',
              name: pde.exercises?.name ?? 'Unknown',
              prescribed_sets: pde.prescribed_sets,
              prescribed_reps: pde.prescribed_reps ?? '10-12',
            }))
            .filter((e) => e.exercise_id),
        })),
    }))

  return (
    <div>
      <PageHeader
        title="Create a plan"
        description="Clone a template or build your own split from scratch — then start it from its page."
      />
      <CustomPlanBuilder
        templates={templates}
        catalog={catalog as unknown as CatalogExercise[]}
      />
    </div>
  )
}