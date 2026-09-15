'use client'

import { useState } from 'react'
import { AdminUserActions } from './admin-user-actions'
import { Badge, Card, Input } from './ui'
import { SearchIcon } from './icons'
import { formatDate } from '@/lib/utils'

export type AdminMember = {
  id: string
  full_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
  plan: string | null
  workoutCount: number
  lastWorkout: string | null
}

export function AdminMembersList({ members }: { members: AdminMember[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q
    ? members.filter(
        (m) =>
          (m.full_name ?? '').toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q)
      )
    : members

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">Members</h2>
        <span className="text-sm font-normal text-zinc-500">
          {q ? `${filtered.length} of ${members.length}` : `(${members.length})`}
        </span>
      </div>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name or email"
          className="h-10 pl-9"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-5 text-sm text-zinc-500">
            {members.length === 0
              ? 'No users yet.'
              : `No members match "${query.trim()}".`}
          </Card>
        ) : (
          filtered.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-50">
                    {m.full_name ?? 'Unnamed user'}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {m.email ?? 'No email recorded'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={m.is_admin ? 'accent' : 'muted'}>
                      {m.is_admin ? 'Admin' : 'Member'}
                    </Badge>
                    {m.plan ? (
                      <Badge>{m.plan}</Badge>
                    ) : (
                      <Badge tone="muted">No active plan</Badge>
                    )}
                    <Badge tone="muted">
                      {m.workoutCount} workout{m.workoutCount === 1 ? '' : 's'}
                    </Badge>
                    {m.lastWorkout ? (
                      <Badge tone="muted">Last: {formatDate(m.lastWorkout)}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    Joined {formatDate(m.created_at)}
                  </p>
                </div>
              </div>
              <AdminUserActions
                userId={m.id}
                displayName={m.full_name ?? m.email ?? 'this user'}
                isAdmin={m.is_admin}
              />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}