import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePostMediaUrl } from '@/lib/supabase/media';
import FollowButton from '@/app/components/FollowButton';
import BlockButton from '@/app/components/BlockButton';
import ProfilePosts from '@/app/components/ProfilePosts';

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);

  const { data: profile, error } = await supabase.from('profiles')
    .select('id, username, display_name, bio, avatar_url, website')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) notFound();

  const [postsResult, followersResult, followingResult, followResult, requestResult, blockResult] = await Promise.all([
    supabase.from('posts').select('id, content, media_url, media_type, created_at').eq('author_id', profile.id).eq('visibility', 'public').order('created_at', { ascending: false }).limit(30),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    user ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    user ? supabase.from('follow_requests').select('id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    user ? supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', profile.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (postsResult.error) throw new Error(postsResult.error.message);
  if (followersResult.error) throw new Error(followersResult.error.message);
  if (followingResult.error) throw new Error(followingResult.error.message);
  if (followResult.error) throw new Error(followResult.error.message);
  if (requestResult.error) throw new Error(requestResult.error.message);
  if (blockResult.error) throw new Error(blockResult.error.message);
  const profilePosts = await Promise.all((postsResult.data ?? []).map(async post => ({
    ...post,
    media_url: await resolvePostMediaUrl(supabase, post.media_url),
  })));

  return (
    <main className="profile-shell">
      <header className="profile-toolbar"><Link href="/">← Home</Link>{user && profile.id === user.id && <Link href="/profile/edit">Edit profile</Link>}</header>
      <section className="profile-hero">
        <div className="profile-banner" />
        <div className="profile-overview">
          <img className="profile-avatar" src={profile.avatar_url ?? '/avatar-placeholder.svg'} alt={`${profile.display_name}'s avatar`} />
          <div className="profile-identity"><h1>{profile.display_name}</h1><p>@{profile.username}</p></div>
          {user && profile.id !== user.id && <div className="profile-controls">
            <FollowButton userId={profile.id} initiallyFollowing={Boolean(followResult.data)} initiallyRequested={Boolean(requestResult.data)} />
            <BlockButton userId={profile.id} initiallyBlocked={Boolean(blockResult.data)} />
          </div>}
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
