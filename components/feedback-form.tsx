'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Card, Textarea } from './ui'
import { formatDate } from '@/lib/utils'

type FeedbackKind = 'bug' | 'suggestion'

export type MyFeedback = {
  id: string
  kind: FeedbackKind
  message: string
  status: 'new' | 'resolved'
  created_at: string
}

export function FeedbackForm({ mine }: { mine: MyFeedback[] }) {
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    const text = message.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('You need to be signed in to send feedback.')
      setSubmitting(false)
      return
    }
    const { error } = await supabase
      .from('feedback')
      .insert({ kind, message: text, user_id: user.id })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setMessage('')
    setSent(true)
  }

  const kinds: Array<{ value: FeedbackKind; label: string }> = [
    { value: 'bug', label: 'Bug report' },
    { value: 'suggestion', label: 'Suggestion' },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                kind === k.value
                  ? 'border-lime-400/40 bg-lime-400/10 text-lime-300'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            kind === 'bug'
              ? 'What went wrong? Add steps to reproduce it if you can...'
              : 'What would make the app better?'
          }
        />

        {error ? (
          <p className="mt-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
            Could not send your {kind === 'bug' ? 'report' : 'suggestion'}: {error}
          </p>
        ) : null}
        {sent ? (
          <p className="mt-3 rounded-lg bg-lime-400/10 px-3 py-2 text-sm text-lime-300">
            Sent! Thanks — the admin will see it in the panel.
          </p>
        ) : null}

        <Button
          onClick={submit}
          disabled={!message.trim() || submitting}
          className="mt-4 w-full"
        >
          {submitting ? 'Sending...' : 'Send feedback'}
        </Button>
      </Card>

      {mine.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">
            Your reports{' '}
            <span className="text-sm font-normal text-zinc-500">({mine.length})</span>
          </h2>
          <div className="space-y-3">
            {mine.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone={r.kind === 'bug' ? 'danger' : 'accent'}>
                    {r.kind === 'bug' ? 'Bug' : 'Suggestion'}
                  </Badge>
                  <Badge tone={r.status === 'resolved' ? 'muted' : 'accent'}>
                    {r.status === 'resolved' ? 'Resolved' : 'New'}
                  </Badge>
                  <span className="ml-auto text-xs text-zinc-600">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">{r.message}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}