export type Achievement = {
  id: string
  icon: string
  title: string
  description: string
  metric: 'workouts' | 'streak'
  target: number
  current: number
  unlocked: boolean
}

const definitions: Array<Omit<Achievement, 'current' | 'unlocked'>> = [
  { id: 'first-workout', icon: '🎉', title: 'First workout', description: 'Log your very first session', metric: 'workouts', target: 1 },
  { id: 'workouts-5', icon: '🔰', title: 'Getting going', description: 'Log 5 workouts', metric: 'workouts', target: 5 },
  { id: 'workouts-10', icon: '💪', title: 'Double digits', description: 'Log 10 workouts', metric: 'workouts', target: 10 },
  { id: 'workouts-25', icon: '🏋️', title: 'In the groove', description: 'Log 25 workouts', metric: 'workouts', target: 25 },
  { id: 'workouts-50', icon: '🥇', title: 'Half century', description: 'Log 50 workouts', metric: 'workouts', target: 50 },
  { id: 'workouts-100', icon: '🏆', title: 'Century club', description: 'Log 100 workouts', metric: 'workouts', target: 100 },
  { id: 'streak-3', icon: '🔥', title: 'Building momentum', description: 'Reach a 3-day streak', metric: 'streak', target: 3 },
  { id: 'streak-7', icon: '📅', title: 'A full week', description: 'Reach a 7-day streak', metric: 'streak', target: 7 },
  { id: 'streak-14', icon: '⚡', title: 'Two weeks strong', description: 'Reach a 14-day streak', metric: 'streak', target: 14 },
  { id: 'streak-30', icon: '🚀', title: 'A month of momentum', description: 'Reach a 30-day streak', metric: 'streak', target: 30 },
]

export function getAchievements(
  totalWorkouts: number,
  longestStreak: number
): Achievement[] {
  return definitions.map((d) => {
    const current = d.metric === 'workouts' ? totalWorkouts : longestStreak
    return { ...d, current, unlocked: current >= d.target }
  })
}