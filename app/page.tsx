import Link from 'next/link'
import { createClient, requireUser } from '@/lib/supabase/server'
import { formatDate, computeWorkoutStreaks, startOfWeek, localDateISO, daysBetween, weekdayIndex, addDays } from '@/lib/utils'
import { REST, defaultScheduleForDays, slotForDate, type ScheduleSlot, type ScheduleSlotList } from '@/lib/schedule'
import { Badge, Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { DeleteWorkoutButton } from '@/components/delete-workout-button'
import { MonthCalendar } from '@/components/month-calendar'

type UserPlanRow = {
  id: string
  active: boolean
  starts_on: string
  schedule: ScheduleSlotList | null
  plans: { id: string; name: string; days_count: number } | null
}

type TodayWorkoutRow = {
  id: string
  date: string
  workout_exercises: Array<{ exercises: { name: string } | null }>
}

type RecentRow = {
  id: string
  date: string
  notes: string | null
  workout_exercises: Array<{ exercises: { name: string } | null }>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const weekStart = startOfWeek()
  const [
    { data: profile },
    { count: workoutsThisWeek },
    { data: recent },
    { data: allDateRows },
    { data: activePlan },
    { data: todayWorkout },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .gte('date', weekStart),
    supabase
      .from('workouts')
      .select('id, date, notes, workout_exercises(exercises(name))')
      .order('date', { ascending: false })
      .limit(3),
    supabase
      .from('workouts')
      .select('date')
      .order('date', { ascending: false })
      .limit(500),
    supabase
      .from('user_plans')
      .select('id, starts_on, schedule, plans(id, name, days_count)')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .maybeSingle(),
    supabase
      .from('workouts')
      .select('id, date, workout_exercises(exercises(name))')
      .eq('date', new Date().toLocaleDateString('en-CA'))
      .maybeSingle(),
  ])

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    (user.email ? user.email.split('@')[0] : 'Athlete')
  const dateRows = (allDateRows ?? []).map((r) => r.date)
  const recentRows = (recent ?? []) as unknown as RecentRow[]
  const plan = (activePlan ?? null) as unknown as UserPlanRow | null
  const doneToday = (todayWorkout ?? null) as unknown as TodayWorkoutRow | null

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = localDateISO()

  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'

  let planLabel = 'Training plan'
  let dayLabel = 'Training day'
  let planSchedule: ScheduleSlotList = []
  let planStartsOn = ''
  if (plan) {
    const shortName = plan.plans?.name?.match(/^\d+-Day/i)?.[0] ?? null
    planLabel = shortName ? `${shortName} Plan` : plan.plans?.name ?? 'Training plan'

    const { data: planDays } = await supabase
      .from('plan_days')
      .select('id, name, position')
      .eq('plan_id', plan.plans?.id ?? '')
    const planDayRows = (planDays ?? []) as Array<{ id: string; name: string; position: number }>
    const dayNameById = new Map(planDayRows.map((pd) => [pd.id, pd.name]))

    const saved = plan.schedule
    const schedule: ScheduleSlotList =
      saved && saved.length > 0
        ? saved
        : defaultScheduleForDays(planDayRows, plan.plans?.days_count ?? 3)

    planSchedule = schedule
    planStartsOn = plan.starts_on

    if (schedule.length > 0) {
      const daysElapsed = Math.max(daysBetween(plan.starts_on, today), 0)
      const index = schedule.length === 7 ? weekdayIndex(today) : daysElapsed % schedule.length
      const slot = schedule[index] as ScheduleSlot
      if (slot.kind === REST) {
        dayLabel = 'Rest day'
      } else if (slot.kind === 'custom') {
        dayLabel = `${slot.name} day`
      } else {
        dayLabel = `${dayNameById.get(slot.planDayId) ?? 'Training'} day`
      }
    }
  }

  const planParam =
    planSchedule.length > 0 ? { schedule: planSchedule, startsOn: planStartsOn } : undefined
  const streaks = computeWorkoutStreaks(dateRows, planParam)

  const quotes = [
    { text: 'The only bad workout is the one that didn\u2019t happen.', emoji: '🔥' },
    { text: 'Strength doesn\u2019t come from what you can do. It comes from overcoming what you once thought you couldn\u2019t.', emoji: '💪' },
    { text: 'The pain you feel today will be the strength you feel tomorrow.', emoji: '⚡' },
    { text: 'Your body can stand almost anything. It\u2019s your mind you have to convince.', emoji: '🧠' },
    { text: 'The clock is ticking. Are you becoming the person you want to be?', emoji: '⏰' },
    { text: 'Success isn\u2019t always about greatness. It\u2019s about consistency.', emoji: '🏆' },
    { text: 'Rest when you need to. Just don\u2019t quit.', emoji: '🛌' },
  ]
  const todayIdx = (new Date().getDay() + 6) % 7
  const dailyQuote = quotes[todayIdx]
  const weekCount = workoutsThisWeek ?? 0
  const motivation =
    weekCount === 0
      ? { text: 'Every journey starts with a single step.', emoji: '🚀' }
      : weekCount <= 2
        ? { text: "You're building momentum. Keep stacking sessions.", emoji: '📈' }
        : weekCount <= 4
          ? { text: 'Consistency is changing your life. One rep at a time.', emoji: '🔥' }
          : { text: "Unstoppable. You\u2019re rewriting what your body can do.", emoji: '⚡' }

  const year = new Date().getFullYear()
  const month = new Date().getMonth()
  const doneDates = (allDateRows ?? []).map((r) => r.date)
  const doneDateSet = new Set(doneDates)

  const missedDates: string[] = []
  if (planSchedule.length > 0) {
    let current = planStartsOn > addDays(today, -60) ? planStartsOn : addDays(today, -60)
    while (current <= today) {
      const slot = slotForDate(planSchedule, planStartsOn, current)
      if (slot.kind !== REST && !doneDateSet.has(current)) {
        missedDates.push(current)
      }
      current = addDays(current, 1)
    }
  }

  const spotlights = [
    {
      name: 'Deadlift',
      emoji: '⚖️',
      text: 'The king of compound movements. Hits your back, glutes, hamstrings, and core in one powerful pull. Master the hinge, own the weight.',
    },
    {
      name: 'Back Squat',
      emoji: '🦵',
      text: 'The foundation of leg strength. Quads, glutes, and core all get worked through a full range of motion. Depth beats ego.',
    },
    {
      name: 'Bench Press',
      emoji: '💪',
      text: 'The classic upper-body builder. Chest, shoulders, and triceps working together. Control the bar on the way down.',
    },
    {
      name: 'Overhead Press',
      emoji: '🙌',
      text: 'Builds powerful shoulders and a rock-solid core. Press heavy, stay braced, and don\u2019t let the lower back arch.',
    },
    {
      name: 'Pull-Up',
      emoji: '🧗',
      text: 'Nothing builds a wider back like pull-ups. If you can\u2019t do one yet, start with negatives or assisted reps.',
    },
    {
      name: 'Barbell Row',
      emoji: '🚣',
      text: 'Adds thickness to your back and strength to your pulls. Bang your chest to the bar, then lower under control.',
    },
    {
      name: 'Romanian Deadlift',
      emoji: '🍑',
      text: 'The hamstring and glute difference-maker. Push your hips back, keep the bar close, and feel the stretch in the hammies.',
    },
  ]
  const spotlight = spotlights[new Date().getDate() % spotlights.length]

  return (
    <div>
      <PageHeader
        title={`Good ${greeting}, ${firstName}`}
        description={
          doneToday
            ? "You have trained today — nice work."
            : plan
              ? 'Ready to train?'
              : 'Welcome to IronTrack.'
        }
        action={
          plan ? (
            <LinkButton href="/today" variant="primary">
              {doneToday ? 'View today' : 'Start today'}
            </LinkButton>
          ) : (
            <LinkButton href="/plans" variant="primary">
              Browse plans
            </LinkButton>
          )
        }
      />

      {/* Today card */}
      {plan ? (
        <Card className="mb-4 overflow-hidden p-0">
          <div className="flex items-stretch">
            <div className="flex flex-1 flex-col justify-center p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {doneToday ? "Today's session" : 'Up next'}
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-50">
                {dayLabel} &middot; {planLabel}
              </p>
              <div className="mt-3 flex gap-1.5">
                {weekDays.map((d, i) => {
                  const date = addDays(weekStart, i)
                  const isToday = i === todayIdx
                  const isPast = date < today
                  const isRest =
                    planSchedule.length > 0 &&
                    slotForDate(planSchedule, planStartsOn, date).kind === REST
                  const isDone = doneDateSet.has(date)
                  const isMissed =
                    isPast && !isDone && !isRest && missedDates.includes(date)
                  const cls = isToday
                    ? 'bg-lime-400 text-zinc-950'
                    : isMissed
                      ? 'bg-zinc-900 text-red-400 ring-1 ring-red-500/70'
                      : isRest
                        ? 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-600/50'
                        : isDone
                          ? 'bg-lime-400/20 text-lime-300'
                          : isPast
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-zinc-900 text-zinc-600'
                  return (
                    <span
                      key={d}
                      title={
                        isRest
                          ? 'Rest day'
                          : isMissed
                            ? 'Missed training day'
                            : isDone
                              ? 'Workout done'
                              : isToday
                                ? 'Today'
                                : d
                      }
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${cls}`}
                    >
                      {d[0]}
                    </span>
                  )
                })}
              </div>
              {planSchedule.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 ring-1 ring-zinc-600/50" /> Rest
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-900 ring-1 ring-red-500/70" /> Missed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-lime-400/20 ring-1 ring-lime-400/50" /> Done
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex w-24 items-center justify-center bg-lime-400/10">
              {doneToday ? (
                <span className="text-3xl">✅</span>
              ) : (
                <span className="text-3xl">💪</span>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-4 p-5">
          <p className="font-semibold text-zinc-100">No active plan</p>
          <p className="mt-1 text-sm text-zinc-500">
            Pick a training plan to get your schedule and daily sessions.
          </p>
          <LinkButton href="/plans" variant="secondary" className="mt-3">
            Browse plans
          </LinkButton>
        </Card>
      )}

      {/* Key stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span className="text-base">🔥</span> Streak
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-zinc-50">
              {streaks.current}
            </p>
            <p className="text-sm text-zinc-500">
              day{streaks.current === 1 ? '' : 's'}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {streaks.current === 0
              ? 'Train today to start one'
              : streaks.current === streaks.longest
                ? '🎉 Best ever!'
                : `${streaks.longest} day best`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span className="text-base">💬</span> Daily quote
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
            {dailyQuote.emoji} &ldquo;{dailyQuote.text}&rdquo;
          </p>
        </Card>
      </div>

      {/* Active month */}
      <MonthCalendar
        defaultYear={year}
        defaultMonth={month}
        doneDates={doneDates}
        missedDates={missedDates}
        today={today}
        doneToday={Boolean(doneToday)}
        weekCount={weekCount}
        motivation={motivation}
        schedule={planSchedule.length > 0 ? planSchedule : undefined}
        startsOn={planStartsOn || undefined}
      />

      {/* Exercise spotlight */}
      <Card className="mb-4 overflow-hidden p-0">
        <div className="flex items-stretch">
          <div className="flex flex-1 flex-col justify-center p-5">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span className="text-base">💀</span> Exercise spotlight
            </p>
            <p className="mt-1 text-base font-bold text-zinc-50">{spotlight.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{spotlight.text}</p>
          </div>
          <div className="flex w-20 items-center justify-center bg-zinc-900">
            <span className="text-5xl">{spotlight.emoji}</span>
          </div>
        </div>
      </Card>

      {/* Recent workouts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Recent</h2>
          <Link
            href="/history"
            className="text-xs font-medium text-lime-400 hover:text-lime-300"
          >
            View all
          </Link>
        </div>

        {recentRows.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            description="Start a plan and your sessions will show up here."
            action={<LinkButton href="/plans">Browse plans</LinkButton>}
          />
        ) : (
          <div className="space-y-2">
            {recentRows.map((w) => {
              const names = w.workout_exercises
                .map((we) => we.exercises?.name)
                .filter((n): n is string => Boolean(n))
              return (
                <Card key={w.id} className="flex items-center gap-4 p-4">
                  <Link
                    href={`/history/${w.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {formatDate(w.date)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {names.slice(0, 3).map((name) => (
                        <Badge key={name} tone="muted">
                          {name}
                        </Badge>
                      ))}
                      {names.length > 3 ? (
                        <Badge tone="muted">+{names.length - 3}</Badge>
                      ) : null}
                    </div>
                  </Link>
                  <DeleteWorkoutButton workoutId={w.id} />
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}