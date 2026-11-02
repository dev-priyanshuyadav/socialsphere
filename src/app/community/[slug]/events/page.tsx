import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCommunityEvent } from '@/app/communities/actions';

export default async function CommunityEventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: community, error: communityError } = await supabase.from('communities')
    .select('id, slug, name').eq('slug', slug).maybeSingle();
  if (communityError) throw new Error(communityError.message);
  if (!community) notFound();
  const [membership, eventsResult] = await Promise.all([
    supabase.from('community_members').select('role').eq('community_id', community.id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_events').select('id, title, description, starts_at')
      .eq('community_id', community.id).order('starts_at').limit(50),
  ]);
  if (membership.error) throw new Error(membership.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  const canCreate = membership.data?.role === 'owner' || membership.data?.role === 'moderator';
  const createAction = createCommunityEvent.bind(null, community.id, community.slug);

  return <main className="utility-page">
    <header><Link href={`/community/${community.slug}`}>← {community.name}</Link><h1>Community events</h1></header>
    {canCreate && <form className="edit-profile-form community-form" action={createAction}>
      <label>Event title<input name="title" minLength={2} maxLength={120} required /></label>
      <label>Description<textarea name="description" rows={3} maxLength={2000} /></label>
      <label>Starts at<input name="starts_at" type="datetime-local" required /></label>
      <button className="utility-button">Create event</button>
    </form>}
    <section className="utility-section">
      {eventsResult.data?.length ? eventsResult.data.map(event => <article className="utility-post" key={event.id}>
        <strong>{event.title}</strong><p>{event.description}</p><small>{new Date(event.starts_at).toLocaleString()}</small>
      </article>) : <p className="utility-empty">No upcoming events.</p>}
    </section>
  </main>;
}
