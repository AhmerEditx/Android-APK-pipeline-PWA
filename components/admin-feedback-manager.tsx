'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Card } from './ui'
import { formatDate } from '@/lib/utils'

export type AdminFeedback = {
  id: string
  kind: 'bug' | 'suggestion'
  message: string
  status: 'new' | 'resolved'
  created_at: string
  reporter: string
}

export function AdminFeedbackManager({ feedback }: { feedback: AdminFeedback[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const openCount = feedback.filter((f) => f.status === 'new').length

  const toggle = async (f: AdminFeedback) => {
    if (busyId) return
    setBusyId(f.id)
    setError(null)
    const supabase = createClient()
    const next = f.status === 'resolved' ? 'new' : 'resolved'
    const { error } = await supabase
      .from('feedback')
      .update({ status: next })
      .eq('id', f.id)
    setBusyId(null)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">Feedback</h2>
        <span className="text-sm font-normal text-zinc-500">
          ({feedback.length}
          {openCount > 0 ? ` · ${openCount} new` : ''})
        </span>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Could not update: {error}
        </p>
      ) : null}

      {feedback.length === 0 ? (
        <Card className="p-5 text-sm text-zinc-500">
          No bug reports or suggestions yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={f.kind === 'bug' ? 'danger' : 'accent'}>
                  {f.kind === 'bug' ? 'Bug' : 'Suggestion'}
                </Badge>
                <Badge tone={f.status === 'resolved' ? 'muted' : 'accent'}>
                  {f.status === 'resolved' ? 'Resolved' : 'New'}
                </Badge>
                <span className="text-xs text-zinc-500">{f.reporter}</span>
                <span className="ml-auto text-xs text-zinc-600">
                  {formatDate(f.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{f.message}</p>
              <Button
                variant={f.status === 'resolved' ? 'ghost' : 'primary'}
                size="sm"
                disabled={busyId === f.id}
                onClick={() => toggle(f)}
                className="mt-3"
              >
                {busyId === f.id
                  ? 'Updating...'
                  : f.status === 'resolved'
                    ? 'Reopen'
                    : 'Mark resolved'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}