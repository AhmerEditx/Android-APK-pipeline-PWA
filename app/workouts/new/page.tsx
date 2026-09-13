import { PageHeader } from '@/components/ui'
import { WorkoutForm } from '@/components/workout-form'
import { createClient, requireUser } from '@/lib/supabase/server'

export const metadata = { title: 'Log Workout' }

export default async function NewWorkoutPage() {
  const supabase = await createClient()
  await requireUser()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .order('muscle_group')
    .order('name')

  return (
    <div>
      <PageHeader title="Log a workout" description="Add exercises, then enter each working set." />
      <WorkoutForm exercises={exercises ?? []} />
    </div>
  )
}