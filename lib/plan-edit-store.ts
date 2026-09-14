import type { EffectiveExercise } from './plan-exercises'

const pending = new Map<string, Record<string, EffectiveExercise[]>>()

export function setPendingPlanExercises(
  planId: string,
  byDay: Record<string, EffectiveExercise[]>
) {
  pending.set(planId, byDay)
}

export function getPendingPlanExercises(
  planId: string
): Record<string, EffectiveExercise[]> | null {
  return pending.get(planId) ?? null
}

export function clearPendingPlanExercises(planId: string) {
  pending.delete(planId)
}
