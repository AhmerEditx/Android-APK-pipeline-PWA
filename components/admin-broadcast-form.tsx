'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, Button, Textarea, Input } from '@/components/ui'

export function BroadcastForm({ userIds }: { userIds: string[] }) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      setError('Add a subject and a message.')
      return
    }
    if (userIds.length === 0) {
      setError('No members to message yet.')
      return
    }

    setSending(true)
    setError(null)
    setDone(null)
    const supabase = createClient()

    const payload = { subject: subject.trim(), body: body.trim() }
    const results = await Promise.allSettled(
      userIds.map((id) => supabase.from('messages').insert({ recipient_id: id, ...payload }))
    )
    const failed = results.filter((r) => r.status === 'rejected' || ('value' in r && r.value.error))
    const sentCount = results.length - failed.length

    if (failed.length === results.length) {
      setError('Could not send messages. Check your admin access.')
      setSending(false)
      return
    }

    setSubject('')
    setBody('')
    setDone(`Sent to ${sentCount} member${sentCount === 1 ? '' : 's'}.`)
    setSending(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleBroadcast} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Subject — goes to all ${userIds.length} members`}>
          <Input
            type="text"
            placeholder="e.g. Reminder: open gym hours this weekend"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Message">
          <Textarea
            rows={1}
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {done ? <p className="text-sm text-lime-400">{done}</p> : null}
      <Button type="submit" variant="secondary" disabled={sending}>
        {sending ? `Sending to ${userIds.length} member${userIds.length === 1 ? '' : 's'}…` : 'Message everyone'}
      </Button>
    </form>
  )
}