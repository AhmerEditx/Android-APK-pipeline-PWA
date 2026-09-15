import { Card, PageHeader } from '@/components/ui'
import { AdminMembersList, type AdminMember } from '@/components/admin-members-list'
import { AdminFeedbackManager, type AdminFeedback } from '@/components/admin-feedback-manager'
import { BroadcastForm } from '@/components/admin-broadcast-form'
import { AdminMessageManager } from '@/components/admin-message-manager'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { REST, restSchedulePositions, type ScheduleSlot, type ScheduleSlotList } from '@/lib/schedule'
import { daysBetween, localDateISO, weekdayIndex } from '@/lib/utils'

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
  schedule: ScheduleSlotList | null
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

type FeedbackRow = {
  id: string
  user_id: string
  kind: 'bug' | 'suggestion'
  message: string
  status: 'new' | 'resolved'
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

export const metadata = { title: 'Admin' }

export default async function AdminPage() {
  const supabase = await createClient()
  await requireAdmin()

  const [{ data: users }, { data: planRows }, { data: workoutRows }, { data: messages }, { data: feedbackRows }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, is_admin, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_plans')
        .select('user_id, starts_on, schedule, plans(name, days_count)')
        .eq('active', true),
      supabase.from('workouts').select('user_id, date').order('date', { ascending: false }),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
      supabase
        .from('feedback')
        .select('id, user_id, kind, message, status, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100),
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

  const feedback: AdminFeedback[] = ((feedbackRows ?? []) as unknown as FeedbackRow[]).map(
    (f) => ({
      id: f.id,
      kind: f.kind,
      message: f.message,
      status: f.status,
      created_at: f.created_at,
      reporter: f.profiles?.full_name ?? f.profiles?.email ?? 'User',
    })
  )

  const members: AdminMember[] = userRows.map((user) => {
    const s = stats.get(user.id) ?? { count: 0, last: null }
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      is_admin: user.is_admin,
      created_at: user.created_at,
      plan: planSummary(user.id),
      workoutCount: s.count,
      lastWorkout: s.last,
    }
  })

  function planSummary(userId: string): string | null {
    const p = planMap.get(userId)
    if (!p?.plans) return null
    const daysElapsed = Math.max(daysBetween(p.starts_on, today), 0)
    const weekIndex = weekdayIndex(today)
    const saved = p.schedule
    if (saved && saved.length > 0) {
      const slot =
        saved.length === 7
          ? saved[weekIndex]
          : (saved[daysElapsed % saved.length] as ScheduleSlot)
      if (slot.kind === REST) return `${p.plans.name} · Rest day`
      if (slot.kind === 'custom') return `${p.plans.name} · ${slot.name}`
      return `${p.plans.name} · Training day`
    }
    const positions = restSchedulePositions(p.plans.days_count)
    const slot = positions[weekIndex]
    if (slot === REST) return `${p.plans.name} · Rest day`
    return `${p.plans.name} · Day ${slot} of ${p.plans.days_count}`
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

      <AdminMembersList members={members} />

      <div className="mt-10">
        <AdminFeedbackManager feedback={feedback} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-zinc-100">All messages</h2>
      <AdminMessageManager
        messages={messageRows.map((msg) => ({
          id: msg.id,
          subject: msg.subject,
          body: msg.body,
          created_at: msg.created_at,
          read_at: msg.read_at,
          recipient: emailOf.get(msg.recipient_id) ?? 'User',
        }))}
      />
    </div>
  )
}