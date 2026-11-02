import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolvePostMediaUrl(supabase: SupabaseClient, mediaPath: string | null) {
  if (!mediaPath) return null;
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
  const { data, error } = await supabase.storage
    .from('social-media-private')
    .createSignedUrl(mediaPath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
