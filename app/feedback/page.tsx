import { PageHeader } from '@/components/ui'
import { FeedbackForm } from '@/components/feedback-form'
import { createClient, requireUser } from '@/lib/supabase/server'

export const metadata = { title: 'Feedback' }

export default async function FeedbackPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from('feedback')
    .select('id, kind, message, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <PageHeader
        title="Feedback"
        description="Report a bug or send a suggestion — it goes straight to the gym admin."
      />
      <FeedbackForm
        mine={(data ?? []).map((r) => ({
          id: r.id,
          kind: r.kind,
          message: r.message,
          status: r.status,
          created_at: r.created_at,
        }))}
      />
    </div>
  )
}