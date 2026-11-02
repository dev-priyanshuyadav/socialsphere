import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePostMediaUrl } from '@/lib/supabase/media';

export default async function ReelsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('posts')
    .select('id, content, media_url, profiles!posts_author_id_fkey(username, display_name, avatar_url)')
    .eq('media_type', 'video').eq('visibility', 'public').order('created_at', { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  const reels = await Promise.all((data ?? []).map(async post => ({
    ...post,
    media_url: await resolvePostMediaUrl(supabase, post.media_url),
  })));
  return <main className="utility-page">
    <header><Link href="/">← Feed</Link><h1>Reels</h1></header>
    {reels.length ? <section className="reels-grid">{reels.map(post => {
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      return <article className="reel-card" key={post.id}>
        <video src={post.media_url ?? undefined} controls playsInline preload="metadata" />
        <Link href={`/u/${author?.username ?? 'user'}`}>{author?.display_name ?? 'SocialSphere user'}</Link>
        <p>{post.content}</p>
        <Link href={`/post/${post.id}`}>Open post and comments</Link>
      </article>;
    })}</section> : <p className="utility-empty">Video posts will appear here when the community shares them.</p>}
  </main>;
}
