'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updatePrivacy(formData: FormData) {
  const isPrivate = formData.get('is_private') === 'on';
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to change privacy settings.');
  const { error } = await supabase.from('profiles').update({ is_private: isPrivate }).eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/settings/privacy');
  revalidatePath('/profile');
}
