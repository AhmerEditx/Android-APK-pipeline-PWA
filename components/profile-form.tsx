'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, Field, Input } from '@/components/ui'

export function ProfileForm({
  fullName,
  heightCm,
}: {
  fullName: string
  heightCm: number | null
  email: string
  memberSince: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState(fullName)
  const [height, setHeight] = useState(heightCm != null ? String(heightCm) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      setSaving(false)
      return
    }
    const parsedHeight = height.trim() === '' ? null : Number(height)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        height_cm: parsedHeight !== null && Number.isFinite(parsedHeight) ? parsedHeight : null,
      })
      .eq('id', user.id)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    router.refresh()
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-zinc-100">Your details</h2>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <Field label="Full name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
          />
        </Field>
        <Field label="Height (cm)" hint="Used to frame your body-weight progress.">
          <Input
            type="number"
            inputMode="decimal"
            min={100}
            max={230}
            step={0.1}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="e.g. 178"
          />
        </Field>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-lime-400">Saved. Your profile is up to date.</p>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Card>
  )
}