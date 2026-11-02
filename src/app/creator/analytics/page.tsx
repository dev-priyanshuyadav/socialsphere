import Link from 'next/link';
import { getCreatorMetrics } from '../data';

export default async function CreatorAnalyticsPage() {
  const metrics = await getCreatorMetrics();
  return <main className="utility-page">
    <header><Link href="/creator">← Creator studio</Link><h1>Analytics</h1></header>
    <p className="utility-description">Measured totals only. Impressions, audience demographics, and historical growth are not tracked yet.</p>
    <section className="creator-metrics">
      <article><span>Posts</span><strong>{metrics.posts}</strong></article>
      <article><span>Followers</span><strong>{metrics.followers}</strong></article>
      <article><span>Likes</span><strong>{metrics.likes}</strong></article>
      <article><span>Comments</span><strong>{metrics.comments}</strong></article>
    </section>
    <nav className="settings-links">
      <Link href="/creator/analytics/audience"><strong>Audience</strong><span>See your current followers.</span></Link>
      <Link href="/creator/analytics/content"><strong>Content</strong><span>Review your posts.</span></Link>
    </nav>
  </main>;
}
