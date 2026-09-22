import { daysBetween, weekdayIndex } from '@/lib/utils'

export const REST = 'rest'

export type ScheduleSlot =
  | { kind: 'day'; planDayId: string }
  | { kind: 'rest' }
  | { kind: 'custom'; name: string }

export type ScheduleSlotList = ScheduleSlot[]

export const WEEK_LENGTH = 7

export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const WEEK_LAYOUTS: Array<Array<number | typeof REST>> = [
  [],
  [1, REST, REST, REST, REST, REST, REST],
  [1, 2, REST, REST, REST, REST, REST],
  [1, REST, 2, REST, 3, REST, REST],
  [1, 2, REST, 3, 4, REST, REST],
  [1, 2, 3, REST, 4, 5, REST],
  [1, 2, 3, 4, 5, 6, REST],
  [1, 2, 3, 4, 5, 6, 7],
]

export function weekdayLayout(daysCount: number): Array<number | typeof REST> {
  const clamped = Math.min(Math.max(daysCount, 1), 7)
  return WEEK_LAYOUTS[clamped] ?? WEEK_LAYOUTS[6]
}

export function restSchedulePositions(daysCount: number): Array<number | typeof REST> {
  return weekdayLayout(daysCount)
}

export function defaultScheduleForDays(
  planDays: Array<{ id: string; position: number }>,
  daysCount: number
): ScheduleSlotList {
  const sorted = [...planDays].sort((a, b) => a.position - b.position)
  const dayByPosition = new Map(sorted.map((d) => [d.position, d.id]))
  return weekdayLayout(daysCount).map((entry) =>
    entry === REST
      ? { kind: REST }
      : { kind: 'day', planDayId: dayByPosition.get(entry as number) ?? (dayByPosition.values().next().value as string) }
  )
}

export function nextTrainingSlot(
  schedule: ScheduleSlotList,
  fromIndex: number
): { slot: ScheduleSlot; index: number } | null {
  for (let step = 1; step <= schedule.length; step++) {
    const index = (fromIndex + step) % schedule.length
    if (schedule[index].kind !== REST) return { slot: schedule[index], index }
  }
  return null
}

export function slotForDate(
  schedule: ScheduleSlotList,
  startsOn: string,
  date: string
): ScheduleSlot {
  if (schedule.length === 0) return { kind: REST }
  const daysElapsed = Math.max(daysBetween(startsOn, date), 0)
  const slotIndex =
    schedule.length === 7 ? weekdayIndex(date) : daysElapsed % schedule.length
  return schedule[slotIndex] ?? { kind: REST }
}