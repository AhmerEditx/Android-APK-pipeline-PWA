export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
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