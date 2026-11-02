'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { markConversationRead } from '../actions';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function MessageTimeline({ conversationId, currentUserId, initialMessages }: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const row = payload.new as Partial<Message>;
        if (typeof row.id !== 'string' || typeof row.sender_id !== 'string'
          || typeof row.content !== 'string' || typeof row.created_at !== 'string') return;
        const nextMessage: Message = {
          id: row.id,
          sender_id: row.sender_id,
          content: row.content,
          created_at: row.created_at,
          read_at: typeof row.read_at === 'string' ? row.read_at : null,
        };
        setMessages(current => current.some(message => message.id === nextMessage.id)
          ? current
          : [...current, nextMessage]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const row = payload.new as Partial<Message>;
        if (typeof row.id !== 'string') return;
        setMessages(current => current.map(message => message.id === row.id
          ? { ...message, read_at: typeof row.read_at === 'string' ? row.read_at : message.read_at }
          : message));
      })
      .subscribe(subscriptionStatus => {
        if (!active) return;
        if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
          setStatus('Realtime connection unavailable. Reload to reconnect.');
        } else if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('');
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    markConversationRead(conversationId).catch(error => {
      setStatus(error instanceof Error ? error.message : 'Unable to update message read status.');
    });
  }, [conversationId, messages.length]);

  return <section className="chat-log" aria-live="polite">
    {status && <p className="chat-status" role="status">{status}</p>}
    {messages.length ? messages.map(message => <article className={`chat-message ${message.sender_id === currentUserId ? 'chat-own' : ''}`} key={message.id}>
      <p>{message.content}</p>
      <time>{new Date(message.created_at).toLocaleString()}</time>
      {message.sender_id === currentUserId && message.read_at && <small className="read-receipt">Seen</small>}
    </article>) : <p className="utility-empty">Start the conversation with a message.</p>}
  </section>;
}
