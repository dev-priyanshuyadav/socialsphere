import Link from 'next/link';
import { getCreatorMetrics } from './data';

export default async function CreatorPage() {
  const metrics = await getCreatorMetrics();
  return <main className="utility-page">
    <header><Link href="/">← Home</Link><h1>Creator studio</h1></header>
    <p className="utility-description">Metrics below are measured from your SocialSphere posts and follows.</p>
    <section className="creator-metrics">
      <article><span>Posts</span><strong>{metrics.posts}</strong></article>
      <article><span>Followers</span><strong>{metrics.followers}</strong></article>
      <article><span>Likes</span><strong>{metrics.likes}</strong></article>
      <article><span>Comments</span><strong>{metrics.comments}</strong></article>
    </section>
    <nav className="settings-links">
      <Link href="/creator/analytics"><strong>Analytics</strong><span>View measured engagement totals.</span></Link>
      <Link href="/creator/posts"><strong>Your posts</strong><span>Review published content.</span></Link>
      <Link href="/creator/drafts"><strong>Drafts</strong><span>Save post ideas for later.</span></Link>
      <Link href="/creator/monetization"><strong>Monetization</strong><span>Payments are not enabled.</span></Link>
    </nav>
  </main>;
}
