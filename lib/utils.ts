export function formatDate(value: string | Date): string {
  const d =
    typeof value === 'string'
      ? value.length === 10
        ? new Date(`${value}T00:00:00`)
        : new Date(value)
      : value
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatNumber(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—'
  return n.toLocaleString('en-GB', { maximumFractionDigits: digits })
}

export function startOfWeek(): string {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  return monday.toISOString().slice(0, 10)
}

export function localDateISO(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function weekdayIndex(value: Date | string = new Date()): number {
  const d = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
  return (d.getDay() + 6) % 7
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime()
  const to = new Date(`${toISO}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86400000)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

type GraceSchedule = Array<{ kind: string; planDayId?: string; name?: string }>

function slotKindForDate(
  schedule: GraceSchedule,
  startsOn: string,
  date: string
): string {
  if (schedule.length === 0) return 'rest'
  const daysElapsed = Math.max(daysBetween(startsOn, date), 0)
  const slotIndex =
    schedule.length === 7 ? weekdayIndex(date) : daysElapsed % schedule.length
  return schedule[slotIndex]?.kind ?? 'rest'
}

export function computeWorkoutStreaks(
  dates: string[],
  plan?: { schedule: GraceSchedule; startsOn: string }
): {
  current: number
  longest: number
} {
  const unique = [...new Set(dates)].sort()
  if (unique.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let seq = 1
  for (let i = 1; i < unique.length; i++) {
    if (daysBetween(unique[i - 1], unique[i]) <= 2) {
      seq++
    } else {
      if (seq > longest) longest = seq
      seq = 1
    }
  }
  if (seq > longest) longest = seq

  const today = localDateISO()
  const dateSet = new Set(unique)

  let current = 0
  if (plan && plan.schedule.length > 0) {
    current = scheduleAwareCurrentStreak(plan.schedule, plan.startsOn, today, dateSet)
  } else {
    let gaps = 0
    let d = dateSet.has(today) ? today : addDays(today, -1)
    while (dateSet.has(d) || gaps < 2) {
      if (dateSet.has(d)) current++
      else gaps++
      d = addDays(d, -1)
    }
  }

  return { current, longest }
}

function scheduleAwareCurrentStreak(
  schedule: GraceSchedule,
  startsOn: string,
  today: string,
  dateSet: Set<string>
): number {
  const GRACE_DAYS = 2
  const lower =
    startsOn > addDays(today, -400) ? startsOn : addDays(today, -400)
  let current = 0
  let d = today
  while (d >= lower) {
    const kind = slotKindForDate(schedule, startsOn, d)
    if (kind === 'rest') {
      d = addDays(d, -1)
      continue
    }
    const daysSince = daysBetween(d, today)
    if (dateSet.has(d)) {
      current++
    } else if (daysSince > GRACE_DAYS) {
      break
    }
    d = addDays(d, -1)
  }
  return current
}