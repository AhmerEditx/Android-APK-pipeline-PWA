import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as { userId?: string; newPassword?: string }
    if (!body.userId) {
      return NextResponse.json({ error: 'Missing user.' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const admin = getServiceClient()
    const { error } = await admin.auth.admin.updateUserById(body.userId, {
      password: body.newPassword,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error.' },
      { status: 500 }
    )
  }
}