'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

      const { error: insertErr } = await supabase.from('user_plans').insert({
        user_id: user.id,
        plan_id: planId,
        starts_on: startsOn ?? new Date().toISOString().slice(0, 10),
      })
      if (insertErr) throw new Error(insertErr.message)

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