import Link from 'next/link'
import { createClient, requireUser } from '@/lib/supabase/server'
import { formatDate, formatNumber, startOfWeek } from '@/lib/utils'
import { Badge, Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { DeleteWorkoutButton } from '@/components/delete-workout-button'

type WorkoutVolumeRow = {
  id: string
  date: string
  workout_exercises: Array<{
    sets: Array<{ weight_kg: number | null; reps: number | null }>
  }>
}

type RecentRow = {
  id: string
  date: string
  notes: string | null
  workout_exercises: Array<{ exercises: { name: string } | null }>
}

async function fetchTotalVolume(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ volume: number }> {
  const rpc = (name: string) =>
    supabase.rpc(name) as unknown as Promise<{
      data: number | null
      error: { code?: string; message?: string } | null
    }>
  const { data, error } = await rpc('get_total_volume')
  if (error?.code !== 'PGRST202') {
    if (error) throw new Error(error.message ?? 'Could not compute volume.')
    return { volume: data ?? 0 }
  }
  const { data: rows } = await supabase
    .from('workouts')
    .select('id, date, workout_exercises(sets(weight_kg, reps))')
    .order('date', { ascending: false })
    .limit(1000)
  const volumeRows = (rows ?? []) as unknown as WorkoutVolumeRow[]
  const volume = volumeRows.reduce(
    (sum, w) =>
      sum +
      w.workout_exercises.reduce(
        (s, we) =>
          s +
          we.sets.reduce(
            (x, set) => x + (set.weight_kg != null && set.reps != null ? set.weight_kg * set.reps : 0),
            0
          ),
        0
      ),
    0
  )
  return { volume }
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-50">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-zinc-500">{sub}</p> : null}
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const weekStart = startOfWeek()
  const [{ data: profile }, { count: totalWorkouts }, { count: workoutsThisWeek }, { data: recent }, { data: measurements }, { volume }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, height_cm')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('workouts').select('id', { count: 'exact', head: true }),
      supabase.from('workouts').select('id', { count: 'exact', head: true }).gte('date', weekStart),
      supabase
        .from('workouts')
        .select('id, date, notes, workout_exercises(exercises(name))')
        .order('date', { ascending: false })
        .limit(3),
      supabase
        .from('body_measurements')
        .select('measured_on, weight_kg')
        .order('measured_on', { ascending: true }),
      fetchTotalVolume(supabase),
    ])

  const totalVolume = volume
  const currentWeight = measurements?.[measurements.length - 1]?.weight_kg ?? null
  const firstName = profile?.full_name?.split(' ')[0] ?? (user.email ? user.email.split('@')[0] : 'Athlete')

  const recentRows = (recent ?? []) as unknown as RecentRow[]

  return (
    <div>
      <PageHeader
        title={totalWorkouts === 0 ? `Welcome, ${firstName} 💪` : `Keep it up, ${firstName}`}
        description="Your training at a glance."
        action={
          <LinkButton href="/today" variant="primary">
            Today&apos;s plan
          </LinkButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Workouts logged" value={String(totalWorkouts)} />
        <StatCard label="This week" value={String(workoutsThisWeek)} sub="Sessions this week" />
        <StatCard label="Total volume" value={`${formatNumber(totalVolume)} kg`} sub="All time" />
        <StatCard
          label="Current weight"
          value={currentWeight != null ? `${formatNumber(currentWeight, 2)} kg` : '—'}
          sub={
            measurements && measurements.length > 1
              ? `Last logged ${formatDate(measurements[measurements.length - 1].measured_on)}`
              : 'Log on Progress page'
          }
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link href="/today" className="group">
          <Card className="h-full p-4 transition-colors group-hover:border-zinc-700">
            <p className="font-semibold text-zinc-100">Today&apos;s plan</p>
            <p className="mt-1 text-sm text-zinc-500">Check off your prescribed session.</p>
          </Card>
        </Link>
        <Link href="/plans" className="group">
          <Card className="h-full p-4 transition-colors group-hover:border-zinc-700">
            <p className="font-semibold text-zinc-100">Training plans</p>
            <p className="mt-1 text-sm text-zinc-500">3 to 7-day splits with a baked-in routine.</p>
          </Card>
        </Link>
        <Link href="/messages" className="group">
          <Card className="h-full p-4 transition-colors group-hover:border-zinc-700">
            <p className="font-semibold text-zinc-100">Messages</p>
            <p className="mt-1 text-sm text-zinc-500">Notes from the gym owner.</p>
          </Card>
        </Link>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Recent workouts</h2>
          <Link href="/history" className="text-sm font-medium text-lime-400 hover:text-lime-300">
            View all
          </Link>
        </div>

{recentRows.length === 0 ? (
            <EmptyState
              title="No workouts yet"
              description="Start a training plan and your sessions will show up here."
              action={<LinkButton href="/plans">Browse plans</LinkButton>}
            />
          ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentRows.map((w) => {
              const names = w.workout_exercises
                .map((we) => we.exercises?.name)
                .filter((n): n is string => Boolean(n))
              return (
                <Card key={w.id} className="h-full p-4 transition-colors group-hover:border-zinc-700">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/history/${w.id}`} className="group min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-100">{formatDate(w.date)}</p>
                    {w.notes ? (
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{w.notes}</p>
                    ) : null}
                  </Link>
                  <DeleteWorkoutButton workoutId={w.id} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="accent">{names.length} exercises</Badge>
                  {names.slice(0, 2).map((name) => (
                    <Badge key={name} tone="muted">
                      {name}
                    </Badge>
                  ))}
                </div>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}