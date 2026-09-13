import { Badge, Card, PageHeader } from '@/components/ui'
import { AdminUserActions } from '@/components/admin-user-actions'
import { BroadcastForm } from '@/components/admin-broadcast-form'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { daysBetween, formatDate, localDateISO } from '@/lib/utils'

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
}

type UserPlanRow = {
  user_id: string
  starts_on: string
  plans: { name: string; days_count: number } | null
}

type WorkoutRow = { user_id: string; date: string }

type MessageRow = {
  id: string
  recipient_id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
}

export const metadata = { title: 'Admin' }

export default async function AdminPage() {
  const supabase = await createClient()
  await requireAdmin()

  const [{ data: users }, { data: planRows }, { data: workoutRows }, { data: messages }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, is_admin, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_plans')
        .select('user_id, starts_on, plans(name, days_count)')
        .eq('active', true),
      supabase.from('workouts').select('user_id, date').order('date', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
    ])

  const userRows = (users ?? []) as unknown as UserRow[]
  const planMap = new Map(
    (planRows ?? ([] as unknown as UserPlanRow[])).map((p) => [
      p.user_id,
      p,
    ])
  )
  const workoutRowsTyped = (workoutRows ?? []) as unknown as WorkoutRow[]
  const today = localDateISO()

  const stats = new Map<string, { count: number; last: string | null }>()
  for (const w of workoutRowsTyped) {
    const s = stats.get(w.user_id) ?? { count: 0, last: null }
    s.count += 1
    if (!s.last) s.last = w.date
    stats.set(w.user_id, s)
  }

  const messageRows = (messages ?? []) as unknown as MessageRow[]
  const emailOf = new Map(userRows.map((u) => [u.id, u.email ?? u.full_name ?? 'User']))

  function planSummary(userId: string): string | null {
    const p = planMap.get(userId)
    if (!p?.plans) return null
    const daysElapsed = Math.max(daysBetween(p.starts_on, today), 0)
    const day = (daysElapsed % p.plans.days_count) + 1
    return `${p.plans.name} · Day ${day} of ${p.plans.days_count}`
  }

  return (
    <div>
      <PageHeader
        title="Admin panel"
        description="Owner-only tools: broadcast or message members, reset passwords, and manage access."
      />

      <h2 className="mb-3 text-lg font-semibold text-zinc-100">Message everyone</h2>
      <Card className="mb-8 p-5 sm:p-6">
        <BroadcastForm userIds={userRows.map((u) => u.id)} />
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-zinc-100">
        Members <span className="text-sm font-normal text-zinc-500">({userRows.length})</span>
      </h2>
      <div className="space-y-3">
        {userRows.length === 0 ? (
          <Card className="p-5 text-sm text-zinc-500">No users yet.</Card>
        ) : (
          userRows.map((user) => {
            const s = stats.get(user.id) ?? { count: 0, last: null }
            const plan = planSummary(user.id)
            return (
              <Card key={user.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-50">
                      {user.full_name ?? 'Unnamed user'}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-400">{user.email ?? 'No email recorded'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={user.is_admin ? 'accent' : 'muted'}>
                        {user.is_admin ? 'Admin' : 'Member'}
                      </Badge>
                      {plan ? <Badge>{plan}</Badge> : <Badge tone="muted">No active plan</Badge>}
                      <Badge tone="muted">
                        {s.count} workout{s.count === 1 ? '' : 's'}
                      </Badge>
                      {s.last ? (
                        <Badge tone="muted">Last: {formatDate(s.last)}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
                <AdminUserActions
                  userId={user.id}
                  displayName={user.full_name ?? user.email ?? 'this user'}
                  isAdmin={user.is_admin}
                />
              </Card>
            )
          })
        )}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-zinc-100">All messages</h2>
      <div className="space-y-3">
        {messageRows.length === 0 ? (
          <Card className="p-5 text-sm text-zinc-500">No messages sent yet.</Card>
        ) : (
          messageRows.map((msg) => (
            <Card key={msg.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-zinc-100">{msg.subject}</p>
                <div className="flex items-center gap-2">
                  <Badge tone="muted">to {emailOf.get(msg.recipient_id)}</Badge>
                  {msg.read_at ? <Badge tone="default">read</Badge> : <Badge tone="accent">unread</Badge>}
                </div>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{msg.body}</p>
              <p className="mt-2 text-xs text-zinc-600">{formatDate(msg.created_at)}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}