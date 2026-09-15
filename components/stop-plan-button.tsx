'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

export function StopPlanButton({
  userPlanId,
  compact = false,
}: {
  userPlanId: string
  compact?: boolean
}) {
  const router = useRouter()
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStop() {
    setStopping(true)
    setError(null)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in.')

      const { error: stopErr } = await supabase
        .from('user_plans')
        .update({ active: false })
        .eq('id', userPlanId)
        .eq('user_id', user.id)
      if (stopErr) throw new Error(stopErr.message)

      router.push('/plans')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop plan.')
      setStopping(false)
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <Button variant="secondary" size="sm" onClick={handleStop} disabled={stopping}>
          {stopping ? 'Stopping…' : 'Stop this plan'}
        </Button>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleStop} disabled={stopping}>
        {stopping ? 'Stopping…' : 'Stop this plan'}
      </Button>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-xs text-zinc-500">
          Ends the current cycle. You can start this or any other plan later.
        </p>
      )}
    </div>
  )
}