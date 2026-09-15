import { PageHeader } from '@/components/ui'
import { AchievementsGrid } from '@/components/achievements-grid'
import { createClient, requireUser } from '@/lib/supabase/server'
import { getAchievements } from '@/lib/achievements'
import { computeWorkoutStreaks } from '@/lib/utils'

export const metadata = { title: 'Achievements' }

export default async function AchievementsPage() {
  await requireUser()
  const supabase = await createClient()
  const [{ count }, { data: dateRows }] = await Promise.all([
    supabase.from('workouts').select('id', { count: 'exact', head: true }),
    supabase.from('workouts').select('date').order('date', { ascending: false }).limit(500),
  ])

  const longestStreak = computeWorkoutStreaks((dateRows ?? []).map((r) => r.date)).longest
  const achievements = getAchievements(count ?? 0, longestStreak)

  return (
    <div>
      <PageHeader
        title="Achievements"
        description="Milestones for workouts logged and streaks you have unlocked."
      />
      <AchievementsGrid achievements={achievements} />
    </div>
  )
}