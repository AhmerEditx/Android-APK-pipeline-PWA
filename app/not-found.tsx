import Link from 'next/link'
import { DumbbellIcon } from '@/components/error-screen'

export default function NotFound() {
  return (
    <div className="flex min-h-[56vh] items-center justify-center px-4 py-6">
      <div className="w-full max-w-[440px] rounded-[20px] border border-zinc-800 bg-zinc-900/60 px-8 py-10 text-center">
        <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-lime-400 text-zinc-900 shadow-[0_0_0_6px_rgba(163,230,53,0.12)]">
          <DumbbellIcon size={26} />
        </div>

        <p className="mt-5 mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lime-400">
          IronTrack
        </p>

        <h1 className="m-0 text-2xl font-extrabold tracking-tight text-zinc-50">
          Page not found
        </h1>

        <p className="mx-auto mt-3 max-w-[340px] text-sm leading-relaxed text-zinc-400">
          Looks like this page took a rest day. Head back home to get back to
          your training.
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-lime-300"
        >
          Back home
        </Link>
      </div>
    </div>
  )
}