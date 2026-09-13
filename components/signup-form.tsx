'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Field, Input } from '@/components/ui'

export function SignupForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() || null },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setSuccess('Account created. Check your email for a confirmation link, then sign in.')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Display name (optional)">
        <Input
          type="text"
          autoComplete="name"
          placeholder="Alex"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </Field>

      <Field label="Email">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password" hint="At least 6 characters.">
        <Input
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-sm text-lime-300">
          {success}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-lime-400 hover:text-lime-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}