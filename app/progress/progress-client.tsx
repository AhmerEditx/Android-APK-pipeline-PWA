'use client'

import {
  ExerciseTrendChart,
  VolumeChart,
  WeightChart,
  WeightLogForm,
  type ExerciseTrend,
  type MeasurementPoint,
  type VolumePoint,
} from '@/components/progress-charts'

export function ProgressCharts({
  measurementPoints,
  volumeByDate,
  trends,
}: {
  measurementPoints: MeasurementPoint[]
  volumeByDate: VolumePoint[]
  trends: ExerciseTrend[]
}) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <WeightLogForm />
        <WeightChart measurements={measurementPoints} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <VolumeChart volumeByDate={volumeByDate} />
        <ExerciseTrendChart trends={trends} />
      </div>
    </>
  )
}