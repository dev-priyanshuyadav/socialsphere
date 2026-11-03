'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type StoryPreview = {
  id: string;
  url: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('You must be signed in to use stories.');
  return { supabase, user };
}

export async function getStories(): Promise<StoryPreview[]> {
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.from('stories')
    .select('id, media_url, profiles!stories_author_id_fkey(username, display_name, avatar_url)')
    .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  const stories = await Promise.all((data ?? []).map(async story => {
    const { data: signed, error: signedError } = await supabase.storage.from('story-media').createSignedUrl(story.media_url, 3600);
    if (signedError) throw new Error(signedError.message);
    const author = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
    return {
      id: story.id,
      url: signed.signedUrl,
      username: author?.username ?? 'user',
      displayName: author?.display_name ?? 'SocialSphere user',
      avatar: author?.avatar_url ?? null,
    };
  }));
  return stories;
}

export async function createStory(mediaPath: string, mediaType: 'image' | 'video', captionValue: string) {
  if (typeof mediaPath !== 'string' || typeof captionValue !== 'string') {
    throw new Error('Story details are invalid.');
  }
  const caption = captionValue.trim();
  if (caption.length > 500) throw new Error('Story captions must be 500 characters or fewer.');
  const { supabase, user } = await authenticatedClient();
  const [ownerId, filename, ...extra] = mediaPath.split('/');
  if (ownerId !== user.id || !filename || extra.length > 0) {
    throw new Error('Story media must belong to your account.');
  }
  const [fileId, extension] = filename.split('.');
  const mediaKindByExtension: Record<string, 'image' | 'video'> = {
    jpg: 'image',
    png: 'image',
    webp: 'image',
    mp4: 'video',
    webm: 'video',
  };
  const mediaKind = mediaKindByExtension[extension ?? ''];
  if (!/^[\da-f-]{36}$/i.test(fileId ?? '') || mediaKind !== mediaType) {
    throw new Error('Choose a supported story file.');
  }

  const { data, error } = await supabase.from('stories').insert({
    author_id: user.id,
    media_url: mediaPath,
    media_type: mediaType,
    caption: caption || null,
  }).select('id').single();
  if (error) {
    const { error: cleanupError } = await supabase.storage.from('story-media').remove([mediaPath]);
    if (cleanupError) throw new Error(`${error.message}; uploaded media cleanup failed: ${cleanupError.message}`);
    throw new Error(error.message);
  }
  revalidatePath('/');
  return data.id;
}

export async function getStory(storyId: string) {
  const { supabase, user } = await authenticatedClient();
  const { data: story, error } = await supabase.from('stories')
    .select('id, author_id, media_url, media_type, caption, expires_at, profiles!stories_author_id_fkey(username, display_name, avatar_url)')
    .eq('id', storyId).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!story) return null;
  const { data: signed, error: signedError } = await supabase.storage.from('story-media').createSignedUrl(story.media_url, 3600);
  if (signedError) throw new Error(signedError.message);
  const { error: viewError } = await supabase.from('story_views').insert({ story_id: storyId, viewer_id: user.id });
  if (viewError && viewError.code !== '23505') throw new Error(viewError.message);
  const { count, error: countError } = await supabase.from('story_views')
    .select('*', { count: 'exact', head: true }).eq('story_id', storyId);
  if (countError) throw new Error(countError.message);
  return { ...story, signedUrl: signed.signedUrl, viewCount: story.author_id === user.id ? count ?? 0 : null };
}
