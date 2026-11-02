import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cancelCommunityRequest, createCommunityPost, joinCommunity, leaveCommunity, requestCommunityAccess } from '@/app/communities/actions';

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: community, error: communityError } = await supabase.from('communities')
    .select('id, slug, name, description, is_private, owner_id').eq('slug', slug).maybeSingle();
  if (communityError) throw new Error(communityError.message);
  if (!community) notFound();

  const [membershipResult, postsResult, requestResult] = await Promise.all([
    supabase.from('community_members').select('role').eq('community_id', community.id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_posts').select('id, content, created_at, author:profiles!community_posts_author_id_fkey(username, display_name)')
      .eq('community_id', community.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('community_join_requests').select('id').eq('community_id', community.id).eq('user_id', user.id).maybeSingle(),
  ]);
  if (membershipResult.error) throw new Error(membershipResult.error.message);
  if (postsResult.error) throw new Error(postsResult.error.message);
  if (requestResult.error) throw new Error(requestResult.error.message);
  const isMember = Boolean(membershipResult.data);
  const postAction = createCommunityPost.bind(null, community.id, community.slug);
  const joinAction = joinCommunity.bind(null, community.id, community.slug);
  const leaveAction = leaveCommunity.bind(null, community.id, community.slug);
  const requestAction = requestCommunityAccess.bind(null, community.id, community.slug);
  const cancelRequestAction = requestResult.data
    ? cancelCommunityRequest.bind(null, requestResult.data.id, community.slug)
    : null;

  return <main className="utility-page">
    <header className="utility-header"><div><Link href="/communities">← Communities</Link><h1>{community.name}</h1></div>
      {isMember && membershipResult.data?.role !== 'owner' && <form action={leaveAction}><button className="utility-button secondary">Leave</button></form>}
    </header>
    <section className="community-detail">
      <p>{community.description || 'A place to connect around shared interests.'}</p>
      <small>{community.is_private ? 'Private' : 'Public'} community · {isMember ? 'Member' : 'Not a member'}</small>
      {isMember && <Link href={`/community/${community.slug}/events`}>View events →</Link>}
      {!isMember && !community.is_private && <form action={joinAction}><button className="utility-button">Join community</button></form>}
      {!isMember && community.is_private && (requestResult.data && cancelRequestAction
        ? <form action={cancelRequestAction}><button className="utility-button secondary">Cancel membership request</button></form>
        : <form action={requestAction}><button className="utility-button">Request to join</button></form>)}
      {isMember && <Link href={`/community/${community.slug}/members`}>View members →</Link>}
    </section>
    {isMember && <form className="chat-compose" action={postAction}>
      <textarea name="content" rows={3} maxLength={5000} placeholder="Share with the community..." required />
      <button className="utility-button">Post</button>
    </form>}
    <section className="utility-section"><h2>Community feed</h2>
      {postsResult.data?.length ? postsResult.data.map(post => {
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        return <article className="utility-post" key={post.id}>
          <strong>{author?.display_name ?? 'Community member'}</strong>
          <p>{post.content}</p>
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </article>;
      }) : <p className="utility-empty">{isMember ? 'No posts yet. Start the conversation.' : 'Join to see the community feed.'}</p>}
    </section>
  </main>;
}
