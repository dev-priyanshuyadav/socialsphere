import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePostMediaUrl } from '@/lib/supabase/media';
import ProfilePosts from '@/app/components/ProfilePosts';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase.from('profiles')
    .select('id, username, display_name, bio, avatar_url, website, created_at')
    .eq('id', user.id)
    .single();
  if (error) throw new Error(error.message);

  const [postsResult, followersResult, followingResult] = await Promise.all([
    supabase.from('posts').select('id, content, media_url, media_type, created_at').eq('author_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
  ]);
  if (postsResult.error) throw new Error(postsResult.error.message);
  if (followersResult.error) throw new Error(followersResult.error.message);
  if (followingResult.error) throw new Error(followingResult.error.message);
  const profilePosts = await Promise.all((postsResult.data ?? []).map(async post => ({
    ...post,
    media_url: await resolvePostMediaUrl(supabase, post.media_url),
  })));

  return (
    <main className="profile-shell">
      <header className="profile-toolbar"><Link href="/">← Home</Link><Link href="/profile/edit">Edit profile</Link></header>
      <section className="profile-hero">
        <div className="profile-banner" />
        <div className="profile-overview">
          <img className="profile-avatar" src={profile.avatar_url ?? '/avatar-placeholder.svg'} alt={`${profile.display_name}'s avatar`} />
          <div className="profile-identity">
            <h1>{profile.display_name}</h1>
            <p>@{profile.username}</p>
          </div>
        </div>
        {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
        {profile.website && <a className="profile-website" href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a>}
        <div className="profile-counts">
          <Link href={`/u/${profile.username}/followers`}><strong>{followersResult.count ?? 0}</strong> Followers</Link>
          <Link href={`/u/${profile.username}/following`}><strong>{followingResult.count ?? 0}</strong> Following</Link>
          <span><strong>{postsResult.data?.length ?? 0}</strong> Posts</span>
        </div>
      </section>
      <section className="profile-feed"><h2>Posts</h2><ProfilePosts posts={profilePosts} /></section>
    </main>
  );
}
