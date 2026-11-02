import Link from 'next/link';

type ProfilePost = {
  id: string;
  content: string;
  media_url: string | null;
  media_type?: 'image' | 'video' | null;
  created_at: string;
};

export default function ProfilePosts({ posts }: { posts: ProfilePost[] }) {
  if (!posts.length) {
    return <div className="profile-empty">No posts yet.</div>;
  }

  return (
    <div className="profile-post-list">
      {posts.map(post => (
        <article className="profile-post" key={post.id}>
          <div className="profile-post-date">{new Date(post.created_at).toLocaleDateString()}</div>
          <p>{post.content}</p>
          {post.media_url && (post.media_type === 'video'
            ? <video src={post.media_url} controls playsInline />
            : <img src={post.media_url} alt="Post media" />)}
          <Link href={`/#post-${post.id}`}>View in feed</Link>
        </article>
      ))}
    </div>
  );
}
