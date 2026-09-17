import Link from 'next/link'
import { Badge, Card, PageHeader } from '@/components/ui'

export const metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About IronTrack"
        description="The story behind the app and how to support it."
      />

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-lime-950/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-zinc-50">About the developer</h2>
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-zinc-500">
            A solo builder focused on clean, useful fitness tools. IronTrack was crafted
            with a simple philosophy: no ads, no bloated features — just the tools you
            actually need to train consistently.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Built with
            </p>
            <p className="mt-1.5 text-sm text-zinc-200">
              Next.js, Supabase, Tailwind CSS
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Focus
            </p>
            <p className="mt-1.5 text-sm text-zinc-200">
              Progressive overload, streaks, simple logging
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Privacy
            </p>
            <p className="mt-1.5 text-sm text-zinc-200">
              Your data stays yours — no ads, no tracking, no selling
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm text-zinc-500">
          Found a bug or have an idea? Send it via the{' '}
          <Link className="font-medium text-lime-400 hover:text-lime-300" href="/feedback">
            feedback page
          </Link>{' '}
          — it goes straight to the developer.
        </p>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-50">Support the project</h2>
          <Badge tone="accent">Coming soon</Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          IronTrack is free, ad-free, and built with care. Ways to support the developer are
          on the way — coffee, local wallets, and more will be available here shortly.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-2.5 text-sm font-semibold text-zinc-500"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M20 3H4v10a4 4 0 0 0 4 4h1a3 3 0 0 0 3-3v-1a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v1a3 3 0 0 0 3 3h1a4 4 0 0 0 4-4V5a2 2 0 0 0-2-2ZM8 15a1 1 0 0 1-1 1H4V4h3a1 1 0 0 1 1 1v10Z" />
            </svg>
            Buy me a coffee
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Soon
            </span>
          </span>
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-2.5 text-sm font-semibold text-zinc-500"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Sponsor
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              Soon
            </span>
          </span>
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          Thank you for training with IronTrack — your support means a lot.
        </p>
      </Card>
    </div>
  )
}
