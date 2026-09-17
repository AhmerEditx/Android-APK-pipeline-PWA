import { ExerciseLibrary } from '@/components/exercise-library'
import { createClient, requireUser } from '@/lib/supabase/server'

export const metadata = { title: 'Exercises' }

export default async function ExercisesPage() {
  const supabase = await createClient()
  await requireUser()

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

  return <ExerciseLibrary exercises={all as never} />
}