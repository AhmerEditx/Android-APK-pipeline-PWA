import { Card, PageHeader } from '@/components/ui'
import { ProfileForm } from '@/components/profile-form'
import { createClient, requireUser } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Profile' }

type ProfileRow = {
  full_name: string | null
  email: string | null
  height_cm: number | null
  created_at: string
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const user = await requireUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, height_cm, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const row = profile as unknown as ProfileRow | null
  const name = row?.full_name?.trim() || user.email?.split('@')[0] || 'Athlete'
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  const memberSince = row?.created_at ? formatDate(row.created_at) : null

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and body stats." />

      <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-lime-950/60 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 text-2xl font-black text-zinc-950 shadow-lg shadow-lime-500/20">
            {initials || 'I'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-50">{name}</h2>
            <p className="text-sm text-zinc-400">{user.email ?? '—'}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Member since {memberSince ?? '—'}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-center">
              <p className="text-lg font-bold text-zinc-50">
                {row?.height_cm != null ? `${row.height_cm} cm` : '—'}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Height
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-center">
              <p className="text-lg font-bold text-zinc-50">{memberSince ?? '—'}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Since
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm
          fullName={row?.full_name ?? ''}
          heightCm={row?.height_cm ?? null}
          email={row?.email ?? user.email ?? ''}
          memberSince={memberSince}
        />
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-zinc-200">{user.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-zinc-500">Member since</dt>
              <dd className="text-zinc-200">{memberSince ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-zinc-500">Signed in</dt>
              <dd className="text-zinc-200">
                {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

    </div>
  )
}