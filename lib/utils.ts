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