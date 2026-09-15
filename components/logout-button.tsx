'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui'
import { LogoutIcon } from './icons'

export function LogoutButton({ asSheetRow = false }: { asSheetRow?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (asSheetRow) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-left transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <LogoutIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-red-400">
            {loading ? 'Signing out…' : 'Sign out'}
          </span>
          <span className="block text-xs text-zinc-500">End this session</span>
        </span>
      </button>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={loading}
      className="text-xs"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}