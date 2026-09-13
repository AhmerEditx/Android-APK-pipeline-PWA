'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { defaultScheduleForDays, type ScheduleSlotList } from '@/lib/schedule'
import { Badge, Button, Card } from '@/components/ui'

type PlanDayInfo = { id: string; position: number; name: string }

export function PlanScheduleEditor({
  userPlanId,
  planDays,
  initialSchedule,
}: {
  userPlanId: string
  planDays: PlanDayInfo[]
  initialSchedule: ScheduleSlotList | null | undefined
}) {
  const router = useRouter()
  const [slots, setSlots] = useState<ScheduleSlotList>(
    initialSchedule && initialSchedule.length > 0
      ? initialSchedule
      : defaultScheduleForDays(planDays)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayName = (planDayId: string) =>
    planDays.find((d) => d.id === planDayId)?.name ?? 'Unknown day'

  function insertAt(index: number, slot: ScheduleSlotList[number]) {
    setSlots((prev) => [...prev.slice(0, index), slot, ...prev.slice(index)])
  }

  function removeAt(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  function renameCustom(index: number, name: string) {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index && slot.kind === 'custom' ? { ...slot, name } : slot))
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('user_plans').update({ schedule: slots }).eq('id', userPlanId)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    router.refresh()
  }

  function reset() {
    setSlots(defaultScheduleForDays(planDays))
  }

  const defaultSlots = defaultScheduleForDays(planDays)
  const isDirty = JSON.stringify(slots) !== JSON.stringify(defaultSlots)

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">Schedule</h2>
        <Badge tone="accent">{slots.length} session slots</Badge>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Your personal cycle. Days repeat in this order — add rest days or extra working days wherever you like.
      </p>

      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div key={index}>
            <div className="flex items-center gap-2 border-b border-zinc-800 py-2">
              {slot.kind === 'rest' ? (
                <>
                  <Badge tone="accent">Rest</Badge>
                  <span className="text-sm text-zinc-300">Recovery day</span>
                </>
              ) : slot.kind === 'custom' ? (
                <>
                  <Badge tone="accent">+</Badge>
                  <input
                    value={slot.name}
                    onChange={(e) => renameCustom(index, e.target.value)}
                    placeholder="Day name"
                    className="w-40 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  />
                  <Badge tone="muted">Extra</Badge>
                </>
              ) : (
                <>
                  <Badge tone="accent">
                    Day {planDays.find((d) => d.id === slot.planDayId)?.position ?? ''}
                  </Badge>
                  <span className="text-sm font-medium text-zinc-100">{dayName(slot.planDayId)}</span>
                </>
              )}

              {slot.kind !== 'day' ? (
                <button
                  onClick={() => removeAt(index)}
                  className="ml-auto text-xs text-zinc-500 transition-colors hover:text-red-400"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 py-1.5">
              <button
                onClick={() => insertAt(index + 1, { kind: 'rest' })}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              >
                + Rest day
              </button>
              <button
                onClick={() => insertAt(index + 1, { kind: 'custom', name: 'New day' })}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              >
                + Working day
              </button>
            </div>
          </div>
        ))}
        {slots.length === 0 ? (
          <button
            onClick={() => insertAt(0, { kind: 'rest' })}
            className="w-full rounded-lg border border-dashed border-zinc-800 py-3 text-sm text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          >
            + Rest day
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save schedule'}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={!isDirty}>
          Reset to default
        </Button>
      </div>
    </Card>
  )
}