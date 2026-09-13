'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, Field, Input, Select } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

export type MeasurementPoint = {
  measured_on: string
  weight_kg: number
  body_fat_pct: number | null
}

export type ExerciseTrend = {
  name: string
  points: Array<{ date: string; max_weight: number }>
}

export type VolumePoint = {
  date: string
  volume: number
}

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#fafafa',
}

const axisTick = { fill: '#71717a', fontSize: 11 }

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
      <div className="mt-4 h-64">{children}</div>
    </Card>
  )
}

export function WeightChart({ measurements }: { measurements: MeasurementPoint[] }) {
  if (measurements.length === 0) {
    return (
      <ChartCard title="Body weight" subtitle="Log your weight on the dashboard or above to see a trend.">
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          No measurements yet
        </div>
      </ChartCard>
    )
  }

  const data = measurements.map((m) => ({
    date: formatDate(m.measured_on),
    'Weight (kg)': m.weight_kg,
  }))

  return (
    <ChartCard title="Body weight" subtitle="Latest measurements over time.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={axisTick} stroke="#3f3f46" />
          <YAxis tick={axisTick} stroke="#3f3f46" domain={['auto', 'auto']} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="Weight (kg)"
            stroke="#a3e635"
            strokeWidth={2}
            dot={{ r: 3, fill: '#a3e635', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function VolumeChart({ volumeByDate }: { volumeByDate: VolumePoint[] }) {
  const data = volumeByDate.map((v) => ({
    date: formatDate(v.date),
    'Volume (kg)': Math.round(v.volume),
  }))

  return (
    <ChartCard title="Training volume" subtitle="Total weight moved per session.">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Log a workout to see volume here
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={axisTick} stroke="#3f3f46" />
            <YAxis tick={axisTick} stroke="#3f3f46" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(163,230,53,0.06)' }} />
            <Bar dataKey="Volume (kg)" fill="#a3e635" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export function ExerciseTrendChart({ trends }: { trends: ExerciseTrend[] }) {
  const [selected, setSelected] = useState<string>(trends[0]?.name ?? '')

  const trend = useMemo(() => trends.find((t) => t.name === selected), [trends, selected])

  if (trends.length === 0) {
    return (
      <ChartCard title="Strength progress" subtitle="Top working weight per exercise over time.">
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Log some workouts to unlock strength trends
        </div>
      </ChartCard>
    )
  }

  const data = (trend?.points ?? []).map((p) => ({
    date: formatDate(p.date),
    'Top weight (kg)': p.max_weight,
  }))

  return (
    <ChartCard
      title="Strength progress"
      subtitle="Top weight lifted per session for an exercise. (Excludes warm-up sets.)"
    >
      <div className="mb-4">
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="max-w-xs">
          {trends.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          No data for this exercise yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={axisTick} stroke="#3f3f46" />
            <YAxis tick={axisTick} stroke="#3f3f46" domain={['auto', 'auto']} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="Top weight (kg)"
              stroke="#a3e635"
              strokeWidth={2}
              dot={{ r: 3, fill: '#a3e635', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export function WeightLogForm({ onSaved }: { onSaved?: () => void }) {
  const [measured_on, setMeasuredOn] = useState(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
  })
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const weightNum = Number(weight)
    if (!measured_on || Number.isNaN(weightNum) || weightNum <= 0) return

    setSaving(true)
    const supabase = createClient()
    const payload = {
      measured_on,
      weight_kg: weightNum,
      body_fat_pct: bodyFat === '' ? null : Number(bodyFat),
    }
    const { error } = await supabase
      .from('body_measurements')
      .upsert(payload, { onConflict: 'user_id,measured_on' })

    if (!error) {
      setWeight('')
      setBodyFat('')
      onSaved?.()
    }
    setSaving(false)
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-100">Log body weight</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="Date">
          <Input type="date" value={measured_on} onChange={(e) => setMeasuredOn(e.target.value)} />
        </Field>
        <Field label="Weight (kg)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            required
            placeholder="80.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="Body fat % (optional)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="15"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Card>
  )
}