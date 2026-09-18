export type AchievementCategory =
  | 'Workouts'
  | 'Streaks'
  | 'Volume'
  | 'Sets'
  | 'Variety'
  | 'Muscles'
  | 'Body'
  | 'Plans'

export type AchievementStats = {
  workouts: number
  longestStreak: number
  volumeKg: number
  totalSets: number
  distinctExercises: number
  distinctMuscles: number
  measurements: number
  plansStarted: number
  planDaysDone: number
}

export type Achievement = {
  id: string
  category: AchievementCategory
  icon: string
  title: string
  description: string
  metric:
    | 'workouts'
    | 'longestStreak'
    | 'volumeKg'
    | 'totalSets'
    | 'distinctExercises'
    | 'distinctMuscles'
    | 'measurements'
    | 'plansStarted'
    | 'planDaysDone'
  target: number
  current: number
  unlocked: boolean
}

export const CATEGORY_META: Record<AchievementCategory, { emoji: string; blurb: string }> = {
  Workouts: { emoji: '🏋️', blurb: 'Total training sessions logged' },
  Streaks: { emoji: '🔥', blurb: 'Consecutive-day consistency' },
  Volume: { emoji: '🏋🏽', blurb: 'Total weight lifted across all workouts' },
  Sets: { emoji: '🔁', blurb: 'Working sets completed' },
  Variety: { emoji: '🧰', blurb: 'Different exercises used' },
  Muscles: { emoji: '💪', blurb: 'Different muscle groups trained' },
  Body: { emoji: '⚖️', blurb: 'Body measurements logged' },
  Plans: { emoji: '📋', blurb: 'Training plans started and completed sessions' },
}

export const CATEGORY_ORDER: AchievementCategory[] = [
  'Workouts',
  'Streaks',
  'Volume',
  'Sets',
  'Variety',
  'Muscles',
  'Body',
  'Plans',
]

type Def = {
  id: string
  category: AchievementCategory
  icon: string
  title: string
  description: string
  metric: Achievement['metric']
  target: number
}

const definitions: Def[] = [
  // Workouts
  { id: 'first-workout', category: 'Workouts', icon: '🎉', title: 'First workout', description: 'Log your very first session', metric: 'workouts', target: 1 },
  { id: 'workouts-5', category: 'Workouts', icon: '🔰', title: 'Getting going', description: 'Log 5 workouts', metric: 'workouts', target: 5 },
  { id: 'workouts-10', category: 'Workouts', icon: '💪', title: 'Double digits', description: 'Log 10 workouts', metric: 'workouts', target: 10 },
  { id: 'workouts-25', category: 'Workouts', icon: '🏋️', title: 'In the groove', description: 'Log 25 workouts', metric: 'workouts', target: 25 },
  { id: 'workouts-50', category: 'Workouts', icon: '🥇', title: 'Half century', description: 'Log 50 workouts', metric: 'workouts', target: 50 },
  { id: 'workouts-100', category: 'Workouts', icon: '🏆', title: 'Century club', description: 'Log 100 workouts', metric: 'workouts', target: 100 },
  { id: 'workouts-200', category: 'Workouts', icon: '🌟', title: 'Dedicated', description: 'Log 200 workouts', metric: 'workouts', target: 200 },
  { id: 'workouts-365', category: 'Workouts', icon: '👑', title: 'A year of training', description: 'Log 365 workouts', metric: 'workouts', target: 365 },

  // Streaks
  { id: 'streak-3', category: 'Streaks', icon: '🔥', title: 'Building momentum', description: 'Reach a 3-day streak', metric: 'longestStreak', target: 3 },
  { id: 'streak-7', category: 'Streaks', icon: '📅', title: 'A full week', description: 'Reach a 7-day streak', metric: 'longestStreak', target: 7 },
  { id: 'streak-14', category: 'Streaks', icon: '⚡', title: 'Two weeks strong', description: 'Reach a 14-day streak', metric: 'longestStreak', target: 14 },
  { id: 'streak-21', category: 'Streaks', icon: '🧱', title: 'Three weeks solid', description: 'Reach a 21-day streak', metric: 'longestStreak', target: 21 },
  { id: 'streak-30', category: 'Streaks', icon: '🚀', title: 'A month of momentum', description: 'Reach a 30-day streak', metric: 'longestStreak', target: 30 },
  { id: 'streak-60', category: 'Streaks', icon: '🌋', title: 'Unstoppable', description: 'Reach a 60-day streak', metric: 'longestStreak', target: 60 },
  { id: 'streak-100', category: 'Streaks', icon: '💎', title: 'Century streak', description: 'Reach a 100-day streak', metric: 'longestStreak', target: 100 },

  // Volume (kg)
  { id: 'volume-1000', category: 'Volume', icon: '⛰️', title: 'A tonne of iron', description: 'Lift 1,000 kg in total volume', metric: 'volumeKg', target: 1000 },
  { id: 'volume-5000', category: 'Volume', icon: '🦍', title: 'Heavy mover', description: 'Lift 5,000 kg in total volume', metric: 'volumeKg', target: 5000 },
  { id: 'volume-10000', category: 'Volume', icon: '🏔️', title: 'Ten grand', description: 'Lift 10,000 kg in total volume', metric: 'volumeKg', target: 10000 },
  { id: 'volume-25000', category: 'Volume', icon: '🐉', title: 'Dragon strength', description: 'Lift 25,000 kg in total volume', metric: 'volumeKg', target: 25000 },
  { id: 'volume-50000', category: 'Volume', icon: '🚚', title: 'Fifty grand', description: 'Lift 50,000 kg in total volume', metric: 'volumeKg', target: 50000 },
  { id: 'volume-100000', category: 'Volume', icon: '🌍', title: 'Mountain mover', description: 'Lift 100,000 kg in total volume', metric: 'volumeKg', target: 100000 },

  // Sets
  { id: 'sets-100', category: 'Sets', icon: '🔁', title: 'One hundred sets', description: 'Complete 100 working sets', metric: 'totalSets', target: 100 },
  { id: 'sets-500', category: 'Sets', icon: '⚙️', title: 'Machine mode', description: 'Complete 500 working sets', metric: 'totalSets', target: 500 },
  { id: 'sets-1000', category: 'Sets', icon: '🏭', title: 'Workhorse', description: 'Complete 1,000 working sets', metric: 'totalSets', target: 1000 },
  { id: 'sets-5000', category: 'Sets', icon: '🏗️', title: 'Set machine', description: 'Complete 5,000 working sets', metric: 'totalSets', target: 5000 },

  // Variety
  { id: 'variety-10', category: 'Variety', icon: '🧰', title: 'Toolbox', description: 'Use 10 different exercises', metric: 'distinctExercises', target: 10 },
  { id: 'variety-25', category: 'Variety', icon: '🎒', title: 'Well-rounded', description: 'Use 25 different exercises', metric: 'distinctExercises', target: 25 },
  { id: 'variety-50', category: 'Variety', icon: '🧠', title: 'Jack of all trades', description: 'Use 50 different exercises', metric: 'distinctExercises', target: 50 },
  { id: 'variety-100', category: 'Variety', icon: '✨', title: 'Exercise explorer', description: 'Use 100 different exercises', metric: 'distinctExercises', target: 100 },

  // Muscles
  { id: 'muscles-3', category: 'Muscles', icon: '💪', title: 'Balanced', description: 'Train 3 different muscle groups', metric: 'distinctMuscles', target: 3 },
  { id: 'muscles-5', category: 'Muscles', icon: '🦾', title: 'Full-body athlete', description: 'Train 5 different muscle groups', metric: 'distinctMuscles', target: 5 },
  { id: 'muscles-8', category: 'Muscles', icon: '🧬', title: 'Do it all', description: 'Train 8 different muscle groups', metric: 'distinctMuscles', target: 8 },
  { id: 'muscles-11', category: 'Muscles', icon: '🌟', title: 'Complete coverage', description: 'Train all 11 muscle groups', metric: 'distinctMuscles', target: 11 },

  // Body
  { id: 'body-1', category: 'Body', icon: '⚖️', title: 'Know your body', description: 'Log your first body measurement', metric: 'measurements', target: 1 },
  { id: 'body-5', category: 'Body', icon: '📏', title: 'Tracking progress', description: 'Log 5 body measurements', metric: 'measurements', target: 5 },
  { id: 'body-10', category: 'Body', icon: '📈', title: 'Trend watcher', description: 'Log 10 body measurements', metric: 'measurements', target: 10 },
  { id: 'body-20', category: 'Body', icon: '🗺️', title: 'Body historian', description: 'Log 20 body measurements', metric: 'measurements', target: 20 },

  // Plans
  { id: 'plan-1', category: 'Plans', icon: '📋', title: 'Committed', description: 'Start your first training plan', metric: 'plansStarted', target: 1 },
  { id: 'plan-3', category: 'Plans', icon: '📚', title: 'Program hopper', description: 'Start 3 different training plans', metric: 'plansStarted', target: 3 },
  { id: 'plan-days-7', category: 'Plans', icon: '🗓️', title: 'Following the plan', description: 'Complete 7 plan workouts', metric: 'planDaysDone', target: 7 },
  { id: 'plan-days-30', category: 'Plans', icon: '🎯', title: 'Program loyal', description: 'Complete 30 plan workouts', metric: 'planDaysDone', target: 30 },
]

function defaultStats(): AchievementStats {
  return {
    workouts: 0,
    longestStreak: 0,
    volumeKg: 0,
    totalSets: 0,
    distinctExercises: 0,
    distinctMuscles: 0,
    measurements: 0,
    plansStarted: 0,
    planDaysDone: 0,
  }
}

export function getAchievements(stats: Partial<AchievementStats> = {}): Achievement[] {
  const full = { ...defaultStats(), ...stats }
  return definitions.map((d) => {
    const current = full[d.metric] ?? 0
    return { ...d, current, unlocked: current >= d.target }
  })
}

export function countUnlocked(achievements: Achievement[]): number {
  return achievements.filter((a) => a.unlocked).length
}