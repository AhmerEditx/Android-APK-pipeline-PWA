import { EmptyState, PageHeader } from '@/components/ui'
import { MessageList } from '@/components/message-list'
import { createClient, requireUser } from '@/lib/supabase/server'

export const metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const supabase = await createClient()
  const user = await requireUser()

  const { data } = await supabase
    .from('messages')
    .select('id, subject, body, created_at, read_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  const unread = (data ?? []).filter((msg) => !msg.read_at).length

  return (
    <div>
      <PageHeader
        title="Messages"
        description={
          unread > 0
            ? `${unread} unread message${unread === 1 ? '' : 's'}.`
            : `You're all caught up.`
        }
      />

      {data && data.length > 0 ? (
        <MessageList messages={data} />
      ) : (
        <EmptyState
          title="No messages yet"
          description="Messages from the gym owner will show up here."
        />
      )}
    </div>
  )
}