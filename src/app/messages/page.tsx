import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setConversationArchived, startConversation } from './actions';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('conversation_members')
    .select('conversation_id, archived_at, conversations(id, updated_at)')
    .eq('user_id', user.id).is('archived_at', null).order('joined_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);

  return <main className="utility-page">
    <header className="utility-header"><div><Link href="/">← Home</Link><h1>Messages</h1></div><Link href="/messages/archived">Archived conversations</Link></header>
    <form className="utility-search" action={startConversation}>
      <input name="username" placeholder="Start a conversation by username" minLength={3} maxLength={24} required />
      <button>New chat</button>
    </form>
    <section className="utility-section"><h2>Your conversations</h2>
      {data?.length ? data.map(row => {
        const conversation = Array.isArray(row.conversations) ? row.conversations[0] : row.conversations;
        if (!conversation) return null;
        return <article className="conversation-row" key={conversation.id}>
          <Link href={`/messages/${conversation.id}`}>
            <span className="conversation-avatar">◎</span><span><strong>Conversation</strong><small>Updated {new Date(conversation.updated_at).toLocaleString()}</small></span><span>Open →</span>
          </Link>
          <form action={setConversationArchived.bind(null, conversation.id, true)}>
            <button className="utility-button secondary">Archive</button>
          </form>
        </article>;
      }) : <p className="utility-empty">No conversations yet. Start one with a username above.</p>}
    </section>
  </main>;
}
