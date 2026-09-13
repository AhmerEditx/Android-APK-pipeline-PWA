export const REST = 'rest'

export type ScheduleSlot = number | typeof REST

export function restSchedule(daysCount: number): ScheduleSlot[] {
  const slots: ScheduleSlot[] = []
  for (let day = 1; day <= daysCount; day++) {
    slots.push(day)
    if (day === 3 && daysCount > 3) slots.push(REST)
  }
  if (daysCount > 0) slots.push(REST)
  return slots
}