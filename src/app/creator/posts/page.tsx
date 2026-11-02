import Link from 'next/link';
import { getCreatorPosts } from '../data';

export default async function CreatorPostsPage() {
  const posts = await getCreatorPosts();
  return <main className="utility-page">
    <header><Link href="/creator">← Creator studio</Link><h1>Your posts</h1></header>
    {posts.length ? posts.map(post => <article className="utility-post" key={post.id}>
      <p>{post.content || 'Media post'}</p><small>{new Date(post.created_at).toLocaleString()}</small>
      <Link href={`/post/${post.id}`}>Open / edit →</Link>
    </article>) : <p className="utility-empty">You have not published any posts yet.</p>}
  </main>;
}
