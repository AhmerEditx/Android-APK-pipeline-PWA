'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  clearPendingPlanExercises,
  getPendingPlanExercises,
} from '@/lib/plan-edit-store'
import type { EffectiveExercise } from '@/lib/plan-exercises'
import { Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export function StartPlanButton({ planId, startsOn }: { planId: string; startsOn?: string }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setStarting(true)
    setError(null)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const { error: deactivateErr } = await supabase
        .from('user_plans')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true)
      if (deactivateErr) throw new Error(deactivateErr.message)

      const { data: created, error: insertErr } = await supabase
        .from('user_plans')
        .insert({
          user_id: user.id,
          plan_id: planId,
          starts_on: startsOn ?? new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single()
      if (insertErr) throw new Error(insertErr.message)

      try {
        const pending = getPendingPlanExercises(planId)
        if (pending) {
          const rows: Array<{
            user_id: string
            user_plan_id: string
            plan_day_id: string
            exercise_id: string
            position: number
            prescribed_sets: number
            prescribed_reps: string | null
            target_weight: string | null
          }> = []
          for (const [dayId, exercises] of Object.entries(pending)) {
            exercises.forEach((ex: EffectiveExercise, index: number) => {
              rows.push({
                user_id: user.id,
                user_plan_id: created.id,
                plan_day_id: dayId,
                exercise_id: ex.exerciseId,
                position: index + 1,
                prescribed_sets: ex.prescribedSets,
                prescribed_reps: ex.prescribedReps || null,
                target_weight: ex.targetWeight || null,
              })
            })
          }
          if (rows.length > 0) {
            await supabase.from('user_plan_exercises').insert(rows)
          }
        } else {
          const { data: days } = (await supabase
            .from('plan_days')
            .select(
              'id, plan_day_exercises(exercise_id, position, prescribed_sets, prescribed_reps, target_weight)'
            )
            .eq('plan_id', planId)) as {
            data: Array<{
              id: string
              plan_day_exercises: Array<{
                exercise_id: string
                position: number
                prescribed_sets: number
                prescribed_reps: string | null
                target_weight: string | null
              }>
            }> | null
          }
          const rows = (days ?? []).flatMap((day) =>
            day.plan_day_exercises.map((pde) => ({
              user_id: user.id,
              user_plan_id: created.id,
              plan_day_id: day.id,
              exercise_id: pde.exercise_id,
              position: pde.position,
              prescribed_sets: pde.prescribed_sets,
              prescribed_reps: pde.prescribed_reps,
              target_weight: pde.target_weight,
            }))
          )
          if (rows.length > 0) {
            await supabase.from('user_plan_exercises').insert(rows)
          }
        }
        clearPendingPlanExercises(planId)
      } catch {
        // Non-fatal: they can still customise later, which materialises the copy.
      }

      router.push('/today')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start plan.')
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleStart} disabled={starting}>
        {starting ? 'Starting…' : startsOn ? `Start on ${formatDate(startsOn)}` : 'Start this plan'}
      </Button>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : startsOn ? (
        <p className="text-xs text-zinc-500">
          You&apos;re on this plan. Starting again restarts the cycle from day 1.
        </p>
      ) : null}
    </div>
  )
}