import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sendMessage } from '../actions';
import MessageTimeline from './MessageTimeline';

export default async function ConversationPage({ params }: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: conversation, error: conversationError } = await supabase.from('conversations')
    .select('id').eq('id', conversationId).maybeSingle();
  if (conversationError) throw new Error(conversationError.message);
  if (!conversation) notFound();
  const { data: messages, error } = await supabase.from('messages')
    .select('id, sender_id, content, created_at, read_at')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(100);
  if (error) throw new Error(error.message);

  return <main className="utility-page">
    <header><Link href="/messages">← Messages</Link><h1>Conversation</h1></header>
    <MessageTimeline conversationId={conversationId} currentUserId={user.id} initialMessages={messages ?? []} />
    <form className="chat-compose" action={sendMessage.bind(null, conversationId)}>
      <textarea name="content" maxLength={5000} rows={2} placeholder="Write a message..." required />
      <button className="utility-button">Send</button>
    </form>
  </main>;
}
