import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolvePostMediaUrl(supabase: SupabaseClient, mediaPath: string | null) {
  if (!mediaPath) return null;

  let objectPath = mediaPath;
  let bucket: 'social-media' | 'social-media-private' = 'social-media-private';
  if (/^https?:\/\//i.test(mediaPath)) {
    const url = new URL(mediaPath);
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!projectUrl || url.origin !== new URL(projectUrl).origin) return mediaPath;

    const legacyPath = url.pathname.match(/\/storage\/v1\/object\/public\/social-media\/(.+)$/);
    if (!legacyPath) return mediaPath;
    bucket = 'social-media';
    objectPath = decodeURIComponent(legacyPath[1]);
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600);
  if (!error) return data.signedUrl;
  if (bucket === 'social-media') throw new Error(error.message);

  const { data: legacyData, error: legacyError } = await supabase.storage
    .from('social-media')
    .createSignedUrl(objectPath, 3600);
  if (legacyError) {
    throw new Error(`Unable to sign post media in either bucket: ${error.message}; ${legacyError.message}`);
  }
  return legacyData.signedUrl;
}
