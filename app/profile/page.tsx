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

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and body stats." />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm
          fullName={row?.full_name ?? ''}
          heightCm={row?.height_cm ?? null}
          email={row?.email ?? user.email ?? ''}
          memberSince={row?.created_at ? formatDate(row.created_at) : null}
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
              <dd className="text-zinc-200">
                {row?.created_at ? formatDate(row.created_at) : '—'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}