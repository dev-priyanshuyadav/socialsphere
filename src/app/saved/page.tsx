import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSavedPosts } from '@/app/actions/social';

export default async function SavedPage() {
  let posts;
  try {
    posts = await getSavedPosts();
  } catch (error) {
    if (error instanceof Error && error.message.includes('signed in')) redirect('/login');
    throw error;
  }

  return (
    <main className="utility-page">
      <header><Link href="/">← Home</Link><h1>Saved posts</h1></header>
      {posts.length ? posts.map(post => <article className="utility-post" key={post.id}>
        <Link href={`/u/${post.username}`}>{post.display_name} <small>@{post.username}</small></Link>
        <p>{post.content}</p>
        {post.media_url && (post.media_type === 'video' ? <video src={post.media_url} controls playsInline /> : <img src={post.media_url} alt="Saved post media" />)}
        <small>{new Date(post.created_at).toLocaleString()}</small>
      </article>) : <p className="utility-empty">Posts you bookmark will be collected here.</p>}
    </main>
  );
}
