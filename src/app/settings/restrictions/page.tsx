import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unblockUser } from '@/app/actions/social';
import { createClient } from '@/lib/supabase/server';

export default async function RestrictionsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('blocks')
    .select('blocked_id, created_at, profiles!blocks_blocked_id_fkey(username, display_name)')
    .eq('blocker_id', user.id).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/settings">← Settings</Link><h1>Blocked accounts</h1></header>
    {data?.length ? data.map(block => {
      const profile = Array.isArray(block.profiles) ? block.profiles[0] : block.profiles;
      return <article className="conversation-row" key={block.blocked_id}>
        <span><strong>{profile?.display_name ?? 'Unavailable account'}</strong>
          <small>{profile ? `@${profile.username}` : block.blocked_id}</small>
        </span>
        <form action={unblockUser.bind(null, block.blocked_id)}><button className="utility-button secondary">Unblock</button></form>
      </article>;
    }) : <p className="utility-empty">You have not blocked any accounts.</p>}
  </main>;
}
