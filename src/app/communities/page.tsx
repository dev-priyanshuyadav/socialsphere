import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CommunitiesPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('communities')
    .select('id, slug, name, description, is_private, community_members(count)')
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header className="utility-header"><div><Link href="/">← Home</Link><h1>Communities</h1></div><Link className="utility-button" href="/communities/create">Create community</Link></header>
    <section className="community-list">
      {data?.length ? data.map(community => <Link className="community-card" href={`/community/${community.slug}`} key={community.id}>
        <span className="community-icon">#</span><strong>{community.name}</strong><p>{community.description || 'A place to connect around shared interests.'}</p>
        <small>{community.is_private ? 'Private' : 'Public'} community</small>
      </Link>) : <p className="utility-empty">No communities yet. Start one for your interests.</p>}
    </section>
  </main>;
}
