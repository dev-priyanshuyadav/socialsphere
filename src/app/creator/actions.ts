'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveDraft(formData: FormData) {
  const content = String(formData.get('content') ?? '');
  if (content.length > 5000) throw new Error('Drafts must be 5,000 characters or fewer.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { error } = await supabase.from('post_drafts').insert({ author_id: user.id, content });
  if (error) throw new Error(error.message);
  revalidatePath('/creator/drafts');
}

export async function deleteDraft(formData: FormData) {
  const draftId = String(formData.get('draft_id') ?? '');
  if (!draftId) throw new Error('Draft ID is required.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { error } = await supabase.from('post_drafts').delete().eq('id', draftId).eq('author_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/creator/drafts');
}
