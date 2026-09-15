'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrashIcon } from './icons'

export function DeleteWorkoutButton({
  workoutId,
  label = 'Delete workout',
}: {
  workoutId: string
  label?: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
    if (error) {
      setDeleting(false)
      window.alert(error.message)
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  )
}