import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { removePost, savePost } from './action';

export default async function EditPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: post, error } = await supabase.from('posts')
    .select('id, content, author_id').eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!post || post.author_id !== user.id) notFound();
  return <main className="utility-page">
    <header><Link href={`/post/${post.id}`}>← Post</Link><h1>Edit post</h1></header>
    <form className="chat-compose edit-post-form" action={savePost}>
      <input type="hidden" name="post_id" value={post.id} />
      <textarea name="content" rows={7} maxLength={5000} defaultValue={post.content} required />
      <button className="utility-button">Save changes</button>
    </form>
    <details className="delete-confirm">
      <summary>Delete post</summary>
      <p>This will permanently remove the post and its comments. This action cannot be undone.</p>
      <form action={removePost}><input type="hidden" name="post_id" value={post.id} /><button className="utility-button secondary">Confirm deletion</button></form>
    </details>
  </main>;
}
