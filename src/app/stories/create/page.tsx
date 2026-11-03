import Link from 'next/link';
import StoryUploadForm from './StoryUploadForm';

export default function CreateStoryPage() {
  return <main className="utility-page">
    <header><Link href="/">← Feed</Link><h1>Create a story</h1></header>
    <p className="utility-description">Stories disappear 24 hours after publishing.</p>
    <StoryUploadForm />
  </main>;
}
