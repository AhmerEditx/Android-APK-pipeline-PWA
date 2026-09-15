'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui'

export function ClearHistoryButton() {
  const router = useRouter()
  const [clearing, setClearing] = useState(false)

  async function handleClear() {
    if (
      !window.confirm(
        'Delete your entire workout history? This removes every session permanently and cannot be undone.'
      )
    ) {
      return
    }
    setClearing(true)
    const supabase = createClient()
    const { error } = await supabase.from('workouts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      setClearing(false)
      window.alert(error.message)
      return
    }
    router.refresh()
  }

  return (
    <Button variant="danger" size="sm" onClick={handleClear} disabled={clearing}>
      {clearing ? 'Clearing…' : 'Clear all history'}
    </Button>
  )
}