'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signedIn() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return { supabase, user };
}

export async function createCommunity(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const isPrivate = formData.get('is_private') === 'on';
  if (name.length < 2 || name.length > 80) throw new Error('Community names must be 2–80 characters.');
  if (description.length > 1000) throw new Error('Description must be 1,000 characters or fewer.');
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) throw new Error('Slug must use 3–48 lowercase letters, numbers, or hyphens.');
  const { supabase, user } = await signedIn();
  const { data, error } = await supabase.from('communities')
    .insert({ name, description, slug, is_private: isPrivate, owner_id: user.id })
    .select('slug').single();
  if (error) {
    if (error.code === '23505') throw new Error('That community address is already in use.');
    throw new Error(error.message);
  }
  redirect(`/community/${data.slug}`);
}

export async function joinCommunity(communityId: string, slug: string) {
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_members').insert({
    community_id: communityId, user_id: user.id, role: 'member',
  });
  if (error && error.code !== '23505') throw new Error(error.message);
  revalidatePath(`/community/${slug}`);
  revalidatePath('/communities');
}

export async function requestCommunityAccess(communityId: string, slug: string) {
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_join_requests').insert({
    community_id: communityId, user_id: user.id,
  });
  if (error && error.code !== '23505') throw new Error(error.message);
  revalidatePath(`/community/${slug}`);
}

export async function cancelCommunityRequest(requestId: string, slug: string) {
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_join_requests')
    .delete().eq('id', requestId).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${slug}`);
}

export async function decideCommunityRequest(requestId: string, slug: string, formData: FormData) {
  const approve = formData.get('approve') === 'true';
  const { supabase, user } = await signedIn();
  const { data: membership, error: membershipError } = await supabase.from('community_members')
    .select('role').eq('community_id', String(formData.get('community_id') ?? '')).eq('user_id', user.id).maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (membership?.role !== 'owner' && membership?.role !== 'moderator') throw new Error('Community moderator access is required.');
  const { error } = await supabase.rpc('decide_community_join_request', {
    target_request_id: requestId,
    approve,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${slug}/members`);
  revalidatePath(`/community/${slug}`);
}

export async function leaveCommunity(communityId: string, slug: string) {
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_members').delete()
    .eq('community_id', communityId).eq('user_id', user.id).neq('role', 'owner');
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${slug}`);
  revalidatePath('/communities');
}

export async function createCommunityPost(communityId: string, slug: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim();
  if (!content || content.length > 5000) throw new Error('Community posts must contain 1–5,000 characters.');
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_posts').insert({
    community_id: communityId, author_id: user.id, content,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${slug}`);
}

export async function createCommunityEvent(communityId: string, slug: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const startsAtValue = String(formData.get('starts_at') ?? '');
  const startsAt = new Date(startsAtValue);
  if (title.length < 2 || title.length > 120) throw new Error('Event titles must be 2–120 characters.');
  if (description.length > 2000) throw new Error('Event descriptions must be 2,000 characters or fewer.');
  if (!startsAtValue || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    throw new Error('Choose an event date in the future.');
  }
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from('community_events').insert({
    community_id: communityId,
    creator_id: user.id,
    title,
    description,
    starts_at: startsAt.toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/community/${slug}/events`);
}
