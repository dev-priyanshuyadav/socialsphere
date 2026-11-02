'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { FeedPost, FeedResult } from '@/lib/supabase/types';
import { resolvePostMediaUrl } from '@/lib/supabase/media';

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('You must be signed in to do that.');
  return { supabase, user };
}

export async function createPost(formData: FormData) {
  const content = String(formData.get('content') ?? '').trim();
  const mediaUrl = String(formData.get('media_url') ?? '').trim() || null;
  const mediaExtension = mediaUrl?.split('.').pop()?.toLowerCase();
  const mediaType = mediaUrl
    ? ['jpg', 'png', 'webp', 'gif'].includes(mediaExtension ?? '') ? 'image'
      : ['mp4', 'webm'].includes(mediaExtension ?? '') ? 'video' : null
    : null;
  if (!content && !mediaUrl) throw new Error('Write something or attach media before publishing.');
  if (content.length > 5000) throw new Error('Posts must be 5,000 characters or fewer.');
  if (mediaUrl && !mediaType) throw new Error('Choose a supported image or video file.');
  const { supabase, user } = await authenticatedClient();
  if (mediaUrl && mediaUrl.split('/')[0] !== user.id) throw new Error('Post media must be uploaded to your own account.');
  const { error } = await supabase.from('posts').insert({ author_id: user.id, content, media_url: mediaUrl, media_type: mediaType });
  if (error) {
    if (mediaUrl) {
      const { error: cleanupError } = await supabase.storage.from('social-media-private').remove([mediaUrl]);
      if (cleanupError) throw new Error(`${error.message}; uploaded media cleanup failed: ${cleanupError.message}`);
    }
    throw new Error(error.message);
  }
  revalidatePath('/');
}

export async function updatePost(postId: string, content: string) {
  const clean = content.trim();
  if (!postId || !clean || clean.length > 5000) throw new Error('Posts must contain 1–5,000 characters.');
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('posts').update({ content: clean }).eq('id', postId).eq('author_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deletePost(postId: string) {
  if (!postId) throw new Error('Post ID is required.');
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function toggleLike(postId: string) {
  const { supabase, user } = await authenticatedClient();
  const { data: existing, error: readError } = await supabase.from('likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  const result = existing
    ? await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    : await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
  if (result.error) throw new Error(result.error.message);
  revalidatePath('/');
}

export async function addComment(postId: string, content: string, parentId?: string) {
  const clean = content.trim();
  if (!clean || clean.length > 2000) throw new Error('Comments must contain 1–2,000 characters.');
  const { supabase, user } = await authenticatedClient();
  if (parentId) {
    const { data: parent, error: parentError } = await supabase.from('comments')
      .select('id').eq('id', parentId).eq('post_id', postId).maybeSingle();
    if (parentError) throw new Error(parentError.message);
    if (!parent) throw new Error('The comment you are replying to is not available.');
  }
  const { error } = await supabase.from('comments').insert({
    post_id: postId, author_id: user.id, content: clean, parent_id: parentId ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function reportPost(postId: string, reason: string) {
  const clean = reason.trim();
  if (!postId || clean.length < 3 || clean.length > 1000) throw new Error('Provide a report reason of 3–1,000 characters.');
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    post_id: postId,
    reason: clean,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/post/${postId}`);
}

export async function toggleFollow(targetUserId: string) {
  const { supabase, user } = await authenticatedClient();
  if (targetUserId === user.id) throw new Error('You cannot follow yourself.');
  const { data: target, error: targetError } = await supabase.from('profiles').select('is_private').eq('id', targetUserId).maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error('That profile does not exist or is unavailable.');
  const { data: existing, error: readError } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    const result = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    if (result.error) throw new Error(result.error.message);
    revalidatePath('/');
    return { following: false, requested: false };
  }
  if (target.is_private) {
    const { data: pending, error: pendingError } = await supabase.from('follow_requests')
      .select('id').eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle();
    if (pendingError) throw new Error(pendingError.message);
    if (pending) {
      const { error } = await supabase.from('follow_requests').delete().eq('id', pending.id).eq('follower_id', user.id);
      if (error) throw new Error(error.message);
      revalidatePath('/');
      return { following: false, requested: false };
    }
    const { error } = await supabase.from('follow_requests').insert({ follower_id: user.id, following_id: targetUserId });
    if (error) throw new Error(error.message);
    revalidatePath('/');
    return { following: false, requested: true };
  }
  const result = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
  if (result.error) throw new Error(result.error.message);
  revalidatePath('/');
  return { following: true, requested: false };
}

export async function acceptFollowRequest(requestId: string) {
  const { supabase } = await authenticatedClient();
  const { error: rpcError } = await supabase.rpc('accept_follow_request', { request_id: requestId });
  if (rpcError) throw new Error(rpcError.message);
  revalidatePath('/notifications');
}

export async function rejectFollowRequest(requestId: string) {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('follow_requests').delete().eq('id', requestId).eq('following_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/notifications');
}

export async function blockUser(targetUserId: string) {
  const { supabase, user } = await authenticatedClient();
  if (!targetUserId || targetUserId === user.id) throw new Error('You cannot block this account.');
  const { error } = await supabase.rpc('block_user', { target_user_id: targetUserId });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/settings/restrictions');
}

export async function unblockUser(targetUserId: string) {
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc('unblock_user', { target_user_id: targetUserId });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/settings/restrictions');
}

export async function toggleBookmark(postId: string) {
  const { supabase, user } = await authenticatedClient();
  const { data: existing, error: readError } = await supabase.from('bookmarks').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  if (readError) throw new Error(readError.message);
  const result = existing
    ? await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
    : await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id });
  if (result.error) throw new Error(result.error.message);
  revalidatePath('/');
}


type FeedQueryRow = {
  id: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string; avatar_url: string | null }[] | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

export async function getFeed(): Promise<FeedResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) return { user: null, bookmarks: [], posts: [] };
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, media_url, media_type, created_at, author_id, profiles!posts_author_id_fkey(id, username, display_name, avatar_url), likes(user_id), comments(id)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  const [profileResult, bookmarksResult, postsCount, followersCount, followingCount] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_url, bio, website').eq('id', user.id).single(),
    supabase.from('bookmarks').select('post_id').eq('user_id', user.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (bookmarksResult.error) throw new Error(bookmarksResult.error.message);
  if (postsCount.error) throw new Error(postsCount.error.message);
  if (followersCount.error) throw new Error(followersCount.error.message);
  if (followingCount.error) throw new Error(followingCount.error.message);
  return {
    user: {
      id: user.id,
      email: user.email,
      profile: profileResult.data,
      stats: {
        posts: postsCount.count ?? 0,
        followers: followersCount.count ?? 0,
        following: followingCount.count ?? 0,
      },
    },
    bookmarks: (bookmarksResult.data ?? []).map((item) => item.post_id),
    posts: await Promise.all((data ?? []).map(async (post: FeedQueryRow): Promise<FeedPost> => {
      const author = post.profiles?.[0];
      return {
        id: post.id, text: post.content, image: await resolvePostMediaUrl(supabase, post.media_url), mediaType: post.media_type, time: new Date(post.created_at).toLocaleString(),
        name: author?.display_name ?? 'SocialSphere user', handle: `@${author?.username ?? 'user'}`,
        avatar: author?.avatar_url ?? '/avatar-placeholder.svg',
        likes: post.likes?.length ?? 0, comments: post.comments?.length ?? 0,
        liked: (post.likes ?? []).some((like) => like.user_id === user.id),
        authorId: post.author_id,
      };
    })),
  };
}

export async function getSearchResults(query: string) {
  const clean = query.trim().replace(/[^a-zA-Z0-9_\s-]/g, ' ').slice(0, 80);
  if (clean.length < 2) return { people: [], posts: [] };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) throw new Error('Sign in to search SocialSphere.');
  const [peopleResult, postsResult] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`).order('username').limit(20),
    supabase.from('posts')    .select('id, content, media_url, media_type, created_at, author_id, profiles!posts_author_id_fkey(username, display_name, avatar_url)')
      .eq('visibility', 'public').ilike('content', `%${clean}%`).order('created_at', { ascending: false }).limit(20),
  ]);
  if (peopleResult.error) throw new Error(peopleResult.error.message);
  if (postsResult.error) throw new Error(postsResult.error.message);
  const people = (peopleResult.data ?? []).filter(person => person.id !== user.id);
  const posts = await Promise.all((postsResult.data ?? []).map(async post => {
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      return {
        id: post.id, content: post.content, media_url: await resolvePostMediaUrl(supabase, post.media_url), media_type: post.media_type, created_at: post.created_at,
        username: author?.username ?? 'user', display_name: author?.display_name ?? 'SocialSphere user',
      };
    }));
  return {
    people,
    posts,
  };
}

export async function getSavedPosts() {
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from('bookmarks')
    .select('post_id, posts(id, content, media_url, media_type, created_at, author_id, profiles!posts_author_id_fkey(username, display_name))')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  const posts = (data ?? []).flatMap(row => {
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    if (!post) return [];
    const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    return [{ ...post, username: author?.username ?? 'user', display_name: author?.display_name ?? 'SocialSphere user' }];
  });
  return Promise.all(posts.map(async post => ({
    ...post,
    media_url: await resolvePostMediaUrl(supabase, post.media_url),
  })));
}

export async function getNotifications() {
  const { supabase, user } = await authenticatedClient();
  const [notifications, requests] = await Promise.all([
    supabase.from('notifications').select('id, type, created_at, read_at, actor:profiles!notifications_actor_id_fkey(username, display_name), post_id')
      .eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('follow_requests').select('id, created_at, requester:profiles!follow_requests_follower_id_fkey(username, display_name, avatar_url)')
      .eq('following_id', user.id).order('created_at', { ascending: false }).limit(50),
  ]);
  if (notifications.error) throw new Error(notifications.error.message);
  if (requests.error) throw new Error(requests.error.message);
  return { notifications: notifications.data ?? [], requests: requests.data ?? [] };
}

export async function markNotificationsRead() {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id).is('read_at', null);
  if (error) throw new Error(error.message);
  revalidatePath('/notifications');
}

export async function saveNotificationPreferences(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from('notification_preferences').upsert({
    user_id: user.id,
    likes: formData.get('likes') === 'on',
    comments: formData.get('comments') === 'on',
    follows: formData.get('follows') === 'on',
    messages: formData.get('messages') === 'on',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/notifications');
  revalidatePath('/notifications/settings');
}

export async function uploadPostMedia(formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose an image first.');
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm',
  };
  const extension = extensions[file.type];
  if (!extension) throw new Error('Use a supported JPG, PNG, WebP, GIF, MP4, or WebM file.');
  if (file.size > 9 * 1024 * 1024) throw new Error('Media must be 9 MB or smaller.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = file.type === 'image/png' && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpeg = file.type === 'image/jpeg' && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isGif = file.type === 'image/gif' && String.fromCharCode(...header.slice(0, 3)) === 'GIF';
  const isWebp = file.type === 'image/webp' && String.fromCharCode(...header.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  const isMp4 = file.type === 'video/mp4' && String.fromCharCode(...header.slice(4, 8)) === 'ftyp';
  const isWebm = file.type === 'video/webm' && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  if (!(isPng || isJpeg || isGif || isWebp || isMp4 || isWebm)) {
    throw new Error('The selected file contents do not match a supported media type.');
  }
  const { supabase, user } = await authenticatedClient();
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('social-media-private').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
