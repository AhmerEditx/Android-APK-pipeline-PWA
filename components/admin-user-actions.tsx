'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Button, Field, Input, Textarea } from '@/components/ui'

export function AdminUserActions({
  userId,
  displayName,
  isAdmin,
}: {
  userId: string
  displayName: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      setError('Add a subject and a message.')
      return
    }
    setSending(true)
    setError(null)
    const supabase = createClient()
    const { error: insertErr } = await supabase.from('messages').insert({
      recipient_id: userId,
      subject: subject.trim(),
      body: body.trim(),
    })
    if (insertErr) {
      setError(insertErr.message)
      setSending(false)
      return
    }
    setSubject('')
    setBody('')
    setSent(true)
    setSending(false)
  }

  async function handleToggle() {
    setToggling(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !isAdmin })
      .eq('id', userId)
    if (error) {
      setError(error.message)
      setToggling(false)
      return
    }
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setResetMsg('Password must be at least 6 characters.')
      return
    }
    setResetting(true)
    setError(null)
    setResetMsg(null)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword }),
    })
    const data = (await res.json()) as { ok?: boolean; error?: string }
    setResetting(false)
    if (!res.ok || !data.ok) {
      setResetMsg(data.error ?? 'Reset failed.')
      return
    }
    setNewPassword('')
    setResetOpen(false)
    setResetMsg('Password updated. Tell the member their new password — it works on their next login.')
  }

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={isAdmin ? 'accent' : 'muted'}>{isAdmin ? 'Admin' : 'Member'}</Badge>
        <Button type="button" variant="secondary" size="sm" onClick={handleToggle} disabled={toggling}>
          {toggling ? '…' : isAdmin ? 'Remove admin' : 'Make admin'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setResetOpen((v) => !v)}>
          Reset password
        </Button>
      </div>

      {resetOpen ? (
        <form onSubmit={handleReset} className="space-y-2">
          <Field label={`New password for ${displayName}`}>
            <Input
              type="text"
              autoComplete="off"
              placeholder="Type a new password…"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          {resetMsg ? <p className="text-xs text-zinc-400">{resetMsg}</p> : null}
          <Button type="submit" variant="secondary" size="sm" disabled={resetting}>
            {resetting ? 'Updating…' : 'Set password'}
          </Button>
        </form>
      ) : null}

      {!resetOpen && resetMsg ? <p className="text-xs text-zinc-400">{resetMsg}</p> : null}

      <form onSubmit={handleSend} className="space-y-2">
        <Field label={`Message ${displayName}`}>
          <Input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Textarea
          rows={2}
          placeholder="Write your message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && !sending ? <p className="text-xs text-red-400">{error}</p> : null}
        {sent ? (
          <p className="text-xs text-lime-400">Message sent.</p>
        ) : null}
        <Button type="submit" variant="secondary" size="sm" disabled={sending}>
          {sending ? 'Sending…' : 'Send message'}
        </Button>
      </form>
    </div>
  )
}