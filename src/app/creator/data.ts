import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getCreatorMetrics() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.rpc('get_creator_metrics');
  if (error) throw new Error(error.message);
  const metrics = data?.[0];
  if (!metrics) throw new Error('Creator metrics are unavailable.');
  return metrics;
}

export async function getCreatorPosts() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('posts')
    .select('id, content, created_at, media_url').eq('author_id', user.id)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
