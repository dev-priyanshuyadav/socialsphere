'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StoryPreview = {
  id: string;
  url: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

const storyMimeTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
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

export async function createStory(formData: FormData) {
  const file = formData.get('file');
  const caption = String(formData.get('caption') ?? '').trim();
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a photo or video.');
  const extension = storyMimeTypes[file.type];
  if (!extension) throw new Error('Use JPG, PNG, WebP, MP4, or WebM media.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Story media must be 50 MB or smaller.');
  if (caption.length > 500) throw new Error('Story captions must be 500 characters or fewer.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validImage = file.type === 'image/jpeg'
    ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
    : file.type === 'image/png'
      ? header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
      : file.type === 'image/webp'
        ? String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
        : file.type === 'video/mp4'
          ? String.fromCharCode(...header.slice(4, 8)) === 'ftyp'
          : header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  if (!validImage) throw new Error('The selected file contents do not match a supported story type.');
  const { supabase, user } = await authenticatedClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('story-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error } = await supabase.from('stories').insert({
    author_id: user.id,
    media_url: path,
    media_type: file.type.startsWith('video/') ? 'video' : 'image',
    caption: caption || null,
  }).select('id').single();
  if (error) {
    const { error: cleanupError } = await supabase.storage.from('story-media').remove([path]);
    if (cleanupError) throw new Error(`${error.message}; uploaded media cleanup failed: ${cleanupError.message}`);
    throw new Error(error.message);
  }
  redirect(`/stories/${data.id}`);
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
