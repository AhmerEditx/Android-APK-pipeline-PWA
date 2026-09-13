import { ExerciseLibrary } from '@/components/exercise-library'
import { createClient, requireUser } from '@/lib/supabase/server'

export const metadata = { title: 'Exercises' }

export default async function ExercisesPage() {
  const supabase = await createClient()
  await requireUser()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .order('muscle_group')
    .order('name')

  return <ExerciseLibrary exercises={exercises ?? []} />
}