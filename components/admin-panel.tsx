'use client'

import { useState, type ComponentType } from 'react'
import { AdminMembersList, type AdminMember } from './admin-members-list'
import { AdminFeedbackManager, type AdminFeedback } from './admin-feedback-manager'
import { AdminMessageManager } from './admin-message-manager'
import { BroadcastForm } from './admin-broadcast-form'
import { Card } from './ui'
import { FeedbackIcon, MessagesIcon, ProfileIcon } from './icons'

function UsageStat({ label, value, limit, warn }: { label: string; value: number; limit?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-sm font-bold ${warn ? 'text-amber-400' : 'text-zinc-200'}`}>
        {value.toLocaleString()}
      </p>
      {limit ? <p className="mt-0.5 text-[11px] text-zinc-600">Free limit: {limit}</p> : null}
    </div>
  )
}

type AdminMessage = {
  id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
  recipient: string
}

type TabId = 'members' | 'feedback' | 'messages'

export type AdminUsage = {
  registeredUsers: number
  activeThisMonth: number
  totalWorkouts: number
  totalSets: number
  totalMeasurements: number
}

export function AdminPanel({
  members,
  feedback,
  messages,
  userIds,
  usage,
}: {
  members: AdminMember[]
  feedback: AdminFeedback[]
  messages: AdminMessage[]
  userIds: string[]
  usage: AdminUsage
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
      <Card className="mb-6 overflow-hidden border-lime-400/20 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">System Usage</h2>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            Supabase dashboard
          </a>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <UsageStat label="Registered users" value={usage.registeredUsers} limit="50,000 MAU" warn={usage.registeredUsers > 30_000} />
          <UsageStat label="Active this month" value={usage.activeThisMonth} limit="50,000 MAU" warn={usage.activeThisMonth > 30_000} />
          <UsageStat label="Total workouts" value={usage.totalWorkouts} />
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <UsageStat label="Total sets logged" value={usage.totalSets} />
          <UsageStat label="Body measurements" value={usage.totalMeasurements} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Monthly egress</p>
            <p className="mt-1.5 text-sm text-zinc-200">5 GB included (free)</p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              Exact usage shown in Supabase dashboard → Billing → Usage.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-600">
          <span>All limits reset monthly.</span>
          <span>
            Upgrade to <span className="font-semibold text-zinc-400">Pro ($25/mo)</span> for 250 GB bandwidth, 100K MAU, 8 GB storage.
          </span>
        </div>
      </Card>

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