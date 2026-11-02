import Link from 'next/link';
import { getCreatorPosts } from '../../data';

export default async function CreatorContentPage() {
  const posts = await getCreatorPosts();
  return <main className="utility-page">
    <header><Link href="/creator/analytics">← Analytics</Link><h1>Content</h1></header>
    {posts.length ? posts.map(post => <article className="utility-post" key={post.id}>
      <p>{post.content || 'Media post'}</p><small>{new Date(post.created_at).toLocaleString()}</small>
      <Link href={`/post/${post.id}`}>Open post →</Link>
    </article>) : <p className="utility-empty">Published posts will appear here.</p>}
  </main>;
}
