'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge, Card } from '@/components/ui'

type MessageRow = {
  id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
}

export function MessageList({ messages }: { messages: MessageRow[] }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)

  async function toggle(id: string, readAt: string | null) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (!readAt) {
      const supabase = createClient()
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const open = openId === msg.id
        return (
          <button
            key={msg.id}
            type="button"
            onClick={() => toggle(msg.id, msg.read_at)}
            className="block w-full text-left"
          >
            <Card className={`p-5 transition-colors ${msg.read_at ? '' : 'border-lime-400/40'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`font-semibold ${msg.read_at ? 'text-zinc-300' : 'text-zinc-50'}`}>
                  {msg.subject}
                </p>
                {msg.read_at ? <Badge tone="muted">Read</Badge> : <Badge tone="accent">New</Badge>}
              </div>
              {open ? <p className="mt-2 text-sm text-zinc-400">{msg.body}</p> : null}
              <p className="mt-2 text-xs text-zinc-600">
                {new Date(`${msg.created_at}`).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </Card>
          </button>
        )
      })}
    </div>
  )
}