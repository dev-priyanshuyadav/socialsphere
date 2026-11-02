import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getStory } from '@/app/actions/stories';

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  let story;
  try {
    story = await getStory(storyId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('signed in')) redirect('/login');
    throw error;
  }
  if (!story) notFound();
  const author = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
  return <main className="story-viewer">
    <header><Link href="/">← Feed</Link><Link href={`/u/${author?.username ?? 'user'}`}>{author?.display_name ?? 'SocialSphere user'}</Link>
      {story.viewCount !== null && <span>{story.viewCount} views</span>}
    </header>
    {story.media_type === 'video' ? <video src={story.signedUrl} controls autoPlay playsInline /> : <img src={story.signedUrl} alt={story.caption ?? 'Story'} />}
    {story.caption && <p>{story.caption}</p>}
    <small>Expires {new Date(story.expires_at).toLocaleString()}</small>
  </main>;
}
