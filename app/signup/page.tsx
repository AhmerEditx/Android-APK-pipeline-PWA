import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui'
import { SignupForm } from '@/components/signup-form'
import { getUser } from '@/lib/supabase/server'

export default async function SignupPage() {
  const user = await getUser()
  if (user) redirect('/')

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 font-bold tracking-tight text-zinc-50">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-lime-400 text-base font-black text-zinc-950">
          I
        </span>
        IronTrack
      </Link>
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-zinc-50">Create your account</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-500">Start logging sets and watching progress.</p>
        <SignupForm />
      </Card>
    </div>
  )
}