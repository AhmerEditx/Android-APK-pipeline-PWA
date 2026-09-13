'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  defaultScheduleForDays,
  WEEKDAY_LABELS,
  type ScheduleSlot,
  type ScheduleSlotList,
} from '@/lib/schedule'
import { Badge, Button, Card } from '@/components/ui'

type PlanDayInfo = { id: string; position: number; name: string }

function slotSelectValue(slot: ScheduleSlot): string {
  return slot.kind === 'day' ? slot.planDayId : slot.kind === 'custom' ? 'custom' : 'rest'
}

export function PlanScheduleEditor({
  userPlanId,
  planDays,
  planDaysCount,
  initialSchedule,
}: {
  userPlanId: string | null
  planDays: PlanDayInfo[]
  planDaysCount: number
  initialSchedule: ScheduleSlotList | null | undefined
}) {
  const router = useRouter()
  const started = userPlanId !== null
  const orderedDays = [...planDays].sort((a, b) => a.position - b.position)
  const [slots, setSlots] = useState<ScheduleSlotList>(() =>
    initialSchedule && initialSchedule.length === 7
      ? initialSchedule
      : defaultScheduleForDays(planDays, planDaysCount)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayName = (planDayId: string) =>
    orderedDays.find((d) => d.id === planDayId)?.name ?? 'Unknown day'

  function setSlotAt(index: number, slot: ScheduleSlot) {
    setSlots((prev) => prev.map((s, i) => (i === index ? slot : s)))
  }

  function onSelect(index: number, value: string) {
    if (value === 'rest') setSlotAt(index, { kind: 'rest' })
    else if (value === 'custom') setSlotAt(index, { kind: 'custom', name: 'New day' })
    else setSlotAt(index, { kind: 'day', planDayId: value })
  }

  function renameCustom(index: number, name: string) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index && slot.kind === 'custom' ? { ...slot, name } : slot))
    )
  }

  async function save() {
    if (!userPlanId) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('user_plans')
      .update({ schedule: slots })
      .eq('id', userPlanId)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    router.refresh()
  }

  function reset() {
    setSlots(defaultScheduleForDays(planDays, planDaysCount))
  }

  const defaultSlots = defaultScheduleForDays(planDays, planDaysCount)
  const isDirty = JSON.stringify(slots) !== JSON.stringify(defaultSlots)

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">Weekly schedule</h2>
        <Badge tone="accent">{planDaysCount}-day plan</Badge>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Your fixed Monday–Sunday cycle. Every plan fits in one week — set each day to a train day, a
        rest day, or an extra working day.
      </p>

      <div className="divide-y divide-zinc-800">
        {slots.map((slot, index) => (
          <div key={WEEKDAY_LABELS[index]} className="flex flex-wrap items-center gap-3 py-2">
            <span className="w-24 shrink-0 text-sm font-medium text-zinc-300">
              {WEEKDAY_LABELS[index]}
            </span>
            {started ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <select
                  value={slotSelectValue(slot)}
                  onChange={(e) => onSelect(index, e.target.value)}
                  className="w-52 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                >
                  {orderedDays.map((d) => (
                    <option key={d.id} value={d.id}>
                      Day {d.position} · {d.name}
                    </option>
                  ))}
                  <option value="rest">Rest day</option>
                  <option value="custom">Extra working day…</option>
                </select>
                {slot.kind === 'custom' ? (
                  <input
                    value={slot.name}
                    onChange={(e) => renameCustom(index, e.target.value)}
                    placeholder="Day name"
                    className="w-40 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  />
                ) : slot.kind === 'rest' ? (
                  <Badge tone="muted">Rest</Badge>
                ) : (
                  <Badge tone="accent">{dayName(slot.planDayId)}</Badge>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {slot.kind === 'rest' ? (
                  <Badge tone="muted">Rest</Badge>
                ) : slot.kind === 'custom' ? (
                  <Badge tone="accent">{slot.name}</Badge>
                ) : (
                  <Badge tone="accent">
                    Day {orderedDays.find((d) => d.id === slot.planDayId)?.position ?? ''} ·{' '}
                    {dayName(slot.planDayId)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {started ? (
        <>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={saving || !isDirty}>
              {saving ? 'Saving…' : 'Save schedule'}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={!isDirty}>
              Reset to default
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          This is your default weekly cycle — start this plan to customise rest days and extra
          working days.
        </p>
      )}
    </Card>
  )
}