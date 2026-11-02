import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { decideCommunityRequest } from '@/app/communities/actions';

export default async function CommunityMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: community, error: communityError } = await supabase.from('communities')
    .select('id, slug, name').eq('slug', slug).maybeSingle();
  if (communityError) throw new Error(communityError.message);
  if (!community) notFound();
  const [membership, membersResult] = await Promise.all([
    supabase.from('community_members').select('role').eq('community_id', community.id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_members').select('user_id, role, profiles!community_members_user_id_fkey(username, display_name, avatar_url)')
      .eq('community_id', community.id).order('joined_at').limit(100),
  ]);
  if (membership.error) throw new Error(membership.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (!membership.data) notFound();
  const canModerate = membership.data.role === 'owner' || membership.data.role === 'moderator';
  const requestsResult = canModerate
    ? await supabase.from('community_join_requests').select('id, created_at, profiles!community_join_requests_user_id_fkey(username, display_name)')
      .eq('community_id', community.id).order('created_at').limit(100)
    : { data: [], error: null };
  if (requestsResult.error) throw new Error(requestsResult.error.message);

  return <main className="utility-page">
    <header><Link href={`/community/${community.slug}`}>← {community.name}</Link><h1>Members</h1></header>
    <section className="utility-section">
      {membersResult.data?.map(member => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        return <Link className="utility-person" href={`/u/${profile?.username ?? 'user'}`} key={member.user_id}>
          <img src={profile?.avatar_url ?? '/avatar-placeholder.svg'} alt="" />
          <span><strong>{profile?.display_name ?? 'Community member'}</strong><small>@{profile?.username ?? 'user'} · {member.role}</small></span>
        </Link>;
      })}
    </section>
    {canModerate && <section className="utility-section"><h2>Membership requests</h2>
      {requestsResult.data?.length ? requestsResult.data.map(request => {
        const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
        const decide = decideCommunityRequest.bind(null, request.id, community.slug);
        return <div className="notification-row" key={request.id}>
          <p>{profile?.display_name ?? 'User'} <small>@{profile?.username ?? 'user'}</small></p>
          <form action={decide}><input type="hidden" name="community_id" value={community.id} /><button className="utility-button" name="approve" value="true">Approve</button></form>
          <form action={decide}><input type="hidden" name="community_id" value={community.id} /><button className="utility-button secondary" name="approve" value="false">Decline</button></form>
        </div>;
      }) : <p className="utility-empty">No pending membership requests.</p>}
    </section>}
  </main>;
}
