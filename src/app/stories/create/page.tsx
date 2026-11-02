import Link from 'next/link';
import { createStory } from '@/app/actions/stories';

export default function CreateStoryPage() {
  return <main className="utility-page">
    <header><Link href="/">← Feed</Link><h1>Create a story</h1></header>
    <p className="utility-description">Stories disappear 24 hours after publishing.</p>
    <form className="edit-profile-form community-form" action={createStory}>
      <label>Photo or video<input type="file" name="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required /></label>
      <label>Caption<textarea name="caption" rows={3} maxLength={500} /></label>
      <button className="utility-button">Share story</button>
    </form>
  </main>;
}
