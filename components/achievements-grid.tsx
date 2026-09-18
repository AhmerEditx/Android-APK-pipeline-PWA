import { Card } from './ui'
import { countUnlocked } from '@/lib/achievements'
import { CATEGORY_ORDER, CATEGORY_META, type Achievement, type AchievementCategory } from '@/lib/achievements'

export function AchievementsCompact({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors ${
            a.unlocked
              ? 'border-lime-400/30 bg-lime-400/5'
              : 'border-zinc-800/60 bg-zinc-950/60 opacity-50 saturate-0'
          }`}
        >
          <span className="text-2xl">{a.icon}</span>
          <span className="text-[11px] font-medium leading-tight text-zinc-300">{a.title}</span>
        </div>
      ))}
    </div>
  )
}

function formatProgress(current: number, metric: Achievement['metric']): string {
  if (metric === 'volumeKg') {
    const fmt = (n: number) =>
      n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))
    return `${fmt(current)} kg`
  }
  if (metric === 'totalSets') {
    const fmt = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
    return `${fmt(current)} sets`
  }
  return String(current)
}

function formatTarget(target: number, metric: Achievement['metric']): string {
  if (metric === 'volumeKg') {
    return target >= 1000 ? `${(target / 1000).toFixed(0)}k kg` : `${target} kg`
  }
  if (metric === 'totalSets') {
    return `${target.toLocaleString()} sets`
  }
  return target.toLocaleString()
}

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  const unlocked = countUnlocked(achievements)
  const total = achievements.length
  const overallPct = total === 0 ? 0 : Math.round((unlocked / total) * 100)

  return (
    <div>
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-100">Overall progress</p>
          <p className="text-sm text-zinc-400">
            <span className="text-lg font-bold text-zinc-50">{unlocked}</span> / {total} unlocked
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {unlocked === 0
            ? 'Log your first workout to start unlocking achievements.'
            : unlocked === total
              ? 'Everything unlocked — you are unstoppable. 🏆'
              : `${overallPct}% complete — keep going!`}
        </p>
      </Card>

      {CATEGORY_ORDER.map((cat: AchievementCategory) => {
        const meta = CATEGORY_META[cat]
        const group = achievements.filter((a) => a.category === cat)
        if (group.length === 0) return null
        const groupUnlocked = group.filter((a) => a.unlocked).length

        return (
          <section key={cat} className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{meta.emoji}</span>
              <h2 className="text-base font-bold text-zinc-100">{cat}</h2>
              <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                {groupUnlocked}/{group.length}
              </span>
            </div>
            <p className="mb-3 text-xs text-zinc-500">{meta.blurb}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((a) => {
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
                        {a.unlocked ? '✓' : `${formatProgress(a.current, a.metric)} / ${formatTarget(a.target, a.metric)}`}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}