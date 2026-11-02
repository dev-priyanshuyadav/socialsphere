'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function savePost(formData: FormData) {
  const postId = String(formData.get('post_id') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (!postId || !content || content.length > 5000) throw new Error('Post content must contain 1–5,000 characters.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { error } = await supabase.from('posts').update({ content }).eq('id', postId).eq('author_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/post/${postId}`);
  revalidatePath('/');
  redirect(`/post/${postId}`);
}

export async function removePost(formData: FormData) {
  const postId = String(formData.get('post_id') ?? '');
  if (!postId) throw new Error('Post ID is required.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: post, error: readError } = await supabase.from('posts').select('media_url')
    .eq('id', postId).eq('author_id', user.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!post) throw new Error('Post not found or you do not own it.');
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', user.id);
  if (error) throw new Error(error.message);
  if (post.media_url && !/^https?:\/\//i.test(post.media_url)) {
    const { error: cleanupError } = await supabase.storage.from('social-media-private').remove([post.media_url]);
    if (cleanupError) throw new Error(`Post deleted, but media cleanup failed: ${cleanupError.message}`);
  }
  revalidatePath('/');
  revalidatePath('/profile');
  redirect('/');
}
