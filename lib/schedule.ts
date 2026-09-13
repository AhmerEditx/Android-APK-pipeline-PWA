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
    slots.push(REST)
  }
  return slots
}

export function defaultScheduleForDays(
  planDays: Array<{ id: string; position: number }>
): ScheduleSlotList {
  const sorted = [...planDays].sort((a, b) => a.position - b.position)
  const slots: ScheduleSlotList = []
  for (const planDay of sorted) {
    slots.push({ kind: 'day', planDayId: planDay.id })
    slots.push({ kind: REST })
  }
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