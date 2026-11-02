import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type ConnectionProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export default async function ConnectionsPage({ params, mode }: {
  params: Promise<{ username: string }>;
  mode: 'followers' | 'following';
}) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id, username')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) notFound();

  const related = mode === 'followers' ? 'profiles!follows_follower_id_fkey' : 'profiles!follows_following_id_fkey';
  const { data, error } = await supabase.from('follows')
    .select(`person:${related}(id, username, display_name, avatar_url)`)
    .eq(mode === 'followers' ? 'following_id' : 'follower_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const people: ConnectionProfile[] = (data ?? []).flatMap((row: { person: ConnectionProfile[] | null }) =>
    row.person ?? [],
  );

  return (
    <main className="profile-shell">
      <header className="profile-toolbar"><Link href={`/u/${profile.username}`}>← @{profile.username}</Link></header>
      <section className="connection-card">
        <h1>{mode === 'followers' ? 'Followers' : 'Following'}</h1>
        {people.length ? <ul className="connection-list">
          {people.map(person => <li key={person.id}>
            <img src={person.avatar_url ?? '/avatar-placeholder.svg'} alt="" />
            <div><strong>{person.display_name}</strong><span>@{person.username}</span></div>
            <Link href={`/u/${person.username}`}>View profile</Link>
          </li>)}
        </ul> : <p className="profile-empty">No {mode} to show yet.</p>}
      </section>
    </main>
  );
}
