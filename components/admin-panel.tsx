'use client'

import { useState, type ComponentType } from 'react'
import { AdminMembersList, type AdminMember } from './admin-members-list'
import { AdminFeedbackManager, type AdminFeedback } from './admin-feedback-manager'
import { AdminMessageManager } from './admin-message-manager'
import { BroadcastForm } from './admin-broadcast-form'
import { Card } from './ui'
import { FeedbackIcon, MessagesIcon, ProfileIcon } from './icons'

type AdminMessage = {
  id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
  recipient: string
}

type TabId = 'members' | 'feedback' | 'messages'

export function AdminPanel({
  members,
  feedback,
  messages,
  userIds,
}: {
  members: AdminMember[]
  feedback: AdminFeedback[]
  messages: AdminMessage[]
  userIds: string[]
}) {
  const [tab, setTab] = useState<TabId>('members')
  const feedbackNew = feedback.filter((f) => f.status === 'new').length
  const unread = messages.filter((m) => !m.read_at).length

  const tabs: Array<{
    id: TabId
    label: string
    icon: ComponentType<{ className?: string }>
    count?: number
    alert?: boolean
  }> = [
    { id: 'members', label: 'Members', icon: ProfileIcon, count: members.length },
    { id: 'feedback', label: 'Feedback', icon: FeedbackIcon, count: feedbackNew, alert: feedbackNew > 0 },
    { id: 'messages', label: 'Messages', icon: MessagesIcon, count: unread, alert: unread > 0 },
  ]

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-zinc-800/80 bg-zinc-950/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto py-2">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-lime-400/40 bg-lime-400/10 text-lime-300'
                    : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count === 0 || t.count === undefined ? null : (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                      t.alert
                        ? 'bg-lime-400 text-zinc-950'
                        : active
                          ? 'bg-lime-400/20 text-lime-300'
                          : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'members' ? <AdminMembersList members={members} /> : null}

      {tab === 'feedback' ? <AdminFeedbackManager feedback={feedback} /> : null}

      {tab === 'messages' ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Compose</h2>
          <Card className="mb-8 p-5 sm:p-6">
            <BroadcastForm userIds={userIds} />
          </Card>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">
            Sent messages{' '}
            <span className="text-sm font-normal text-zinc-500">({messages.length})</span>
          </h2>
          <AdminMessageManager messages={messages} />
        </div>
      ) : null}
    </div>
  )
}