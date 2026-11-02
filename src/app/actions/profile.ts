'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const bio = String(formData.get('bio') ?? '').trim();
  const website = String(formData.get('website') ?? '').trim();

  if (displayName.length < 1 || displayName.length > 80) {
    return { error: 'Your name must be between 1 and 80 characters.' };
  }
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return { error: 'Usernames must be 3–24 characters and use only letters, numbers, or underscores.' };
  }
  if (bio.length > 300) return { error: 'Your bio must be 300 characters or fewer.' };
  if (website) {
    try {
      const parsed = new URL(website);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      return { error: 'Enter a valid website URL beginning with http:// or https://.' };
    }
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'You must be signed in to edit your profile.' };

  const { error } = await supabase.from('profiles').update({
    display_name: displayName,
    username,
    bio: bio || null,
    website: website || null,
  }).eq('id', user.id);

  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken.' };
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/profile');
  revalidatePath('/profile/edit');
  revalidatePath(`/u/${username}`);
  return { error: null };
}
