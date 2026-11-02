import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addComment, reportPost } from '@/app/actions/social';
import { createClient } from '@/lib/supabase/server';
import { resolvePostMediaUrl } from '@/lib/supabase/media';

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  const { data: post, error } = await supabase.from('posts')
    .select('id, author_id, content, media_url, media_type, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_url)')
    .eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!post) notFound();
  const mediaUrl = await resolvePostMediaUrl(supabase, post.media_url);
  const { data: comments, error: commentsError } = await supabase.from('comments')
    .select('id, author_id, content, created_at, profiles!comments_author_id_fkey(username, display_name)')
    .eq('post_id', postId).order('created_at', { ascending: true }).limit(100);
  if (commentsError) throw new Error(commentsError.message);
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const commentAction = async (formData: FormData) => {
    'use server';
    await addComment(postId, String(formData.get('content') ?? ''));
  };
  const reportAction = async (formData: FormData) => {
    'use server';
    await reportPost(postId, String(formData.get('reason') ?? ''));
  };

  return <main className="utility-page">
    <header><Link href="/">← Feed</Link><h1>Post</h1></header>
    <article className="utility-post post-detail">
      <Link href={`/u/${author?.username ?? 'user'}`}>{author?.display_name ?? 'SocialSphere user'} <small>@{author?.username ?? 'user'}</small></Link>
      <p>{post.content}</p>
      {mediaUrl && (post.media_type === 'video' ? <video src={mediaUrl} controls playsInline /> : <img src={mediaUrl} alt="Post media" />)}
      <small>{new Date(post.created_at).toLocaleString()}</small>
      {user && post.author_id !== user.id && <details className="report-box"><summary>Report this post</summary>
        <form action={reportAction}><textarea name="reason" minLength={3} maxLength={1000} placeholder="Tell us why this post should be reviewed." required /><button className="utility-button secondary">Submit report</button></form>
      </details>}
      {user && post.author_id === user.id && <Link className="utility-button" href={`/post/${post.id}/edit`}>Edit post</Link>}
    </article>
    <section className="utility-section"><h2>Comments</h2>
      {comments?.length ? comments.map(comment => {
        const commenter = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        const replyAction = async (formData: FormData) => {
          'use server';
          await addComment(postId, String(formData.get('content') ?? ''), comment.id);
        };
        return <article className="utility-post" key={comment.id}>
          <Link href={`/u/${commenter?.username ?? 'user'}`}>{commenter?.display_name ?? 'SocialSphere user'}</Link>
          <p>{comment.content}</p><small>{new Date(comment.created_at).toLocaleString()}</small>
          {user && <form className="reply-form" action={replyAction}>
            <input name="content" maxLength={2000} placeholder="Reply to this comment..." required />
            <button className="utility-button secondary">Reply</button>
          </form>}
        </article>;
      }) : <p className="utility-empty">No comments yet.</p>}
      {user && <form className="chat-compose" action={commentAction}>
        <textarea name="content" rows={2} maxLength={2000} placeholder="Write a comment..." required />
        <button className="utility-button">Comment</button>
      </form>}
    </section>
  </main>;
}
