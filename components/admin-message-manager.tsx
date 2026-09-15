'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Card, Input } from '@/components/ui'

type ManagedMessage = {
  id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
  recipient: string
}

export function AdminMessageManager({ messages }: { messages: ManagedMessage[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function beginEdit(msg: ManagedMessage) {
    setEditingId(msg.id)
    setSubject(msg.subject)
    setBody(msg.body)
    setError(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const cleanSubject = subject.trim()
    const cleanBody = body.trim()
    if (!cleanSubject || !cleanBody) {
      setError('Subject and body are required.')
      setSaving(false)
      return
    }
    const { error: updateErr } = await supabase
      .from('messages')
      .update({ subject: cleanSubject, body: cleanBody })
      .eq('id', id)
    setSaving(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this message? Recipients will no longer see it.')) return
    const supabase = createClient()
    const { error: delErr } = await supabase.from('messages').delete().eq('id', id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    router.refresh()
  }

  if (messages.length === 0) {
    return <Card className="p-5 text-sm text-zinc-500">No messages sent yet.</Card>
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const editing = editingId === msg.id
        return (
          <Card key={msg.id} className="p-5">
            {editing ? (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  aria-label="Subject"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  aria-label="Body"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveEdit(msg.id)} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-100">{msg.subject}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">to {msg.recipient}</Badge>
                    {msg.read_at ? (
                      <Badge tone="default">read</Badge>
                    ) : (
                      <Badge tone="accent">unread</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{msg.body}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-600">
                    {new Date(`${msg.created_at}`).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => beginEdit(msg)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(msg.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}