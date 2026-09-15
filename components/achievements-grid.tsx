import { Card } from './ui'
import type { Achievement } from '@/lib/achievements'

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length

  return (
    <div>
      <Card className="mb-6 flex items-center justify-between p-5">
        <p className="text-sm font-semibold text-zinc-100">Progress</p>
        <p className="text-sm text-zinc-400">
          <span className="text-lg font-bold text-zinc-50">{unlocked}</span>{' '}
          / {achievements.length} unlocked
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {achievements.map((a) => {
          const pct = Math.min(Math.round((a.current / a.target) * 100), 100)
          return (
            <Card
              key={a.id}
              className={`flex flex-col p-4 transition-colors ${
                a.unlocked ? 'border-lime-400/30' : 'opacity-60 saturate-0'
              }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                  a.unlocked ? 'bg-lime-400/10' : 'bg-zinc-800/60'
                }`}
              >
                {a.icon}
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-100">{a.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">{a.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-lime-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-medium text-zinc-500">
                  {Math.min(a.current, a.target)}/{a.target}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}