'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function startConversation(formData: FormData) {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Enter a valid username.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: target, error } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (error) throw new Error(error.message);
  if (!target || target.id === user.id) throw new Error('Choose another valid SocialSphere user.');
  const { data: conversationId, error: createError } = await supabase.rpc('create_conversation', { member_ids: [target.id] });
  if (createError) throw new Error(createError.message);
  redirect(`/messages/${conversationId}`);
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim();
  if (!content || content.length > 5000) throw new Error('Messages must contain 1–5,000 characters.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to read messages.');
  const { error } = await supabase.rpc('mark_conversation_read', {
    target_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}
