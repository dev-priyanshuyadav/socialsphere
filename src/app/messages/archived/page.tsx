import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setConversationArchived } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function ArchivedMessagesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');

  const { data, error } = await supabase.from('conversation_members')
    .select('conversation_id, archived_at, conversations(id, updated_at)')
    .eq('user_id', user.id).not('archived_at', 'is', null)
    .order('archived_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);

  return <main className="utility-page">
    <header><Link href="/messages">← Messages</Link><h1>Archived conversations</h1></header>
    <section className="utility-section">
      {data?.length ? data.map(row => {
        const conversation = Array.isArray(row.conversations) ? row.conversations[0] : row.conversations;
        if (!conversation) return null;
        return <article className="conversation-row" key={conversation.id}>
          <Link href={`/messages/${conversation.id}`}>
            <span className="conversation-avatar">◎</span>
            <span><strong>Conversation</strong><small>Updated {new Date(conversation.updated_at).toLocaleString()}</small></span>
            <span>Open →</span>
          </Link>
          <form action={setConversationArchived.bind(null, conversation.id, false)}>
            <button className="utility-button secondary">Restore</button>
          </form>
        </article>;
      }) : <p className="utility-empty">No archived conversations.</p>}
    </section>
  </main>;
}
