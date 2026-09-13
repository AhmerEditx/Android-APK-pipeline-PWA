export const REST = 'rest'

export type ScheduleSlot =
  | { kind: 'day'; planDayId: string }
  | { kind: 'rest' }
  | { kind: 'custom'; name: string }

export type ScheduleSlotList = ScheduleSlot[]

export function restSchedulePositions(daysCount: number): Array<number | typeof REST> {
  const slots: Array<number | typeof REST> = []
  for (let day = 1; day <= daysCount; day++) {
    slots.push(day)
    if (day === 3 && daysCount > 3) slots.push(REST)
  }
  if (daysCount > 0) slots.push(REST)
  return slots
}

export function defaultScheduleForDays(
  planDays: Array<{ id: string; position: number }>
): ScheduleSlotList {
  const sorted = [...planDays].sort((a, b) => a.position - b.position)
  const slots: ScheduleSlotList = []
  for (let i = 0; i < sorted.length; i++) {
    slots.push({ kind: 'day', planDayId: sorted[i].id })
    if (i === 2 && sorted.length > 3) slots.push({ kind: REST })
  }
  if (sorted.length > 0) slots.push({ kind: REST })
  return slots
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