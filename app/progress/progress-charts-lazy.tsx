'use client'

import dynamic from 'next/dynamic'
import type { ExerciseTrend, MeasurementPoint, VolumePoint } from '@/components/progress-charts'

const ProgressCharts = dynamic(
  () => import('./progress-client').then((m) => ({ default: m.ProgressCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-zinc-900" />
        <div className="h-40 animate-pulse rounded-xl bg-zinc-900" />
      </div>
    ),
  }
)

export function ProgressChartsLazy({
  measurementPoints,
  volumeByDate,
  trends,
}: {
  measurementPoints: MeasurementPoint[]
  volumeByDate: VolumePoint[]
  trends: ExerciseTrend[]
}) {
  return <ProgressCharts measurementPoints={measurementPoints} volumeByDate={volumeByDate} trends={trends} />
}