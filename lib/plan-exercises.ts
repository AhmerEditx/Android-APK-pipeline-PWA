export type PlanDayExerciseRow = {
  id: string
  position: number
  prescribed_sets: number
  prescribed_reps: string | null
  target_weight: string | null
  exercises: { id: string; name: string; muscle_group: string } | null
}

export type TemplatePlanDay = {
  id: string
  name: string
  position: number
  plan_day_exercises: PlanDayExerciseRow[]
}

export type UserPlanExerciseRow = {
  id: string
  plan_day_id: string
  exercise_id: string
  position: number
  prescribed_sets: number
  prescribed_reps: string | null
  target_weight: string | null
  exercises: { id: string; name: string; muscle_group: string } | null
}

export type EffectiveExercise = {
  refId: string
  fromUser: boolean
  exerciseId: string
  name: string
  muscleGroup: string
  prescribedSets: number
  prescribedReps: string | null
  targetWeight: string | null
}

export function effectiveExercisesForDay(
  day: TemplatePlanDay,
  userRows: UserPlanExerciseRow[],
  customized: boolean
): EffectiveExercise[] {
  if (!customized) {
    return [...day.plan_day_exercises]
      .sort((a, b) => a.position - b.position)
      .map((pde) => ({
        refId: pde.id,
        fromUser: false,
        exerciseId: pde.exercises?.id ?? '',
        name: pde.exercises?.name ?? 'Unknown exercise',
        muscleGroup: pde.exercises?.muscle_group ?? '',
        prescribedSets: pde.prescribed_sets,
        prescribedReps: pde.prescribed_reps,
        targetWeight: pde.target_weight,
      }))
  }
  return userRows
    .filter((r) => r.plan_day_id === day.id)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      refId: r.id,
      fromUser: true,
      exerciseId: r.exercise_id,
      name: r.exercises?.name ?? 'Unknown exercise',
      muscleGroup: r.exercises?.muscle_group ?? '',
      prescribedSets: r.prescribed_sets,
      prescribedReps: r.prescribed_reps,
      targetWeight: r.target_weight,
    }))
}
