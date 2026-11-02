import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CreatorAudiencePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('follows')
    .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('following_id', user.id).order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/creator/analytics">← Analytics</Link><h1>Audience</h1></header>
    {data?.length ? data.map(row => {
      const follower = Array.isArray(row.follower) ? row.follower[0] : row.follower;
      return follower && <Link className="utility-person" href={`/u/${follower.username}`} key={follower.id}>
        <img src={follower.avatar_url ?? '/avatar-placeholder.svg'} alt="" />
        <span><strong>{follower.display_name}</strong><small>@{follower.username}</small></span>
      </Link>;
    }) : <p className="utility-empty">No followers yet.</p>}
  </main>;
}
