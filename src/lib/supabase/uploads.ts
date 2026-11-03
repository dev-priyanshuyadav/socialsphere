import type { SupabaseClient } from '@supabase/supabase-js';

type UploadBucket = 'social-media-private' | 'story-media';

const mediaTypes: Record<UploadBucket, Record<string, string>> = {
  'social-media-private': {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  },
  'story-media': {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  },
};

const maxFileSizes: Record<UploadBucket, number> = {
  'social-media-private': 9 * 1024 * 1024,
  'story-media': 50 * 1024 * 1024,
};

function hasExpectedSignature(file: File, header: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...header.slice(start, end));
  return (file.type === 'image/jpeg' && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || (file.type === 'image/png' && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47)
    || (file.type === 'image/gif' && ascii(0, 3) === 'GIF')
    || (file.type === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP')
    || (file.type === 'video/mp4' && ascii(4, 8) === 'ftyp')
    || (file.type === 'video/webm' && header[0] === 0x1a && header[1] === 0x45
      && header[2] === 0xdf && header[3] === 0xa3);
}

export async function uploadMediaFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  bucket: UploadBucket,
) {
  if (!userId) throw new Error('You must be signed in to upload media.');
  if (file.size === 0) throw new Error('Choose a media file first.');
  const extension = mediaTypes[bucket][file.type];
  if (!extension) throw new Error('Choose a supported image or video file.');
  if (file.size > maxFileSizes[bucket]) {
    const maxSizeMb = maxFileSizes[bucket] / (1024 * 1024);
    throw new Error(`Media must be ${maxSizeMb} MB or smaller.`);
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasExpectedSignature(file, header)) {
    throw new Error('The selected file contents do not match a supported media type.');
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return {
    path,
    mediaType: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
  };
}
