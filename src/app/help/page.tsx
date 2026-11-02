import Link from 'next/link';

export const metadata = { title: 'Help | SocialSphere' };
export default function HelpPage() {
  return <main className="utility-page public-info">
    <header><Link href="/">SocialSphere</Link><Link href="/signup">Create an account →</Link></header>
    <section className="public-info-hero"><span>SUPPORT</span><h1>How can we help?</h1><p>Find help with account access, profile privacy, posting, and community safety.</p></section>
    <section className="utility-section"><h2>Account access</h2><p>Use <Link href="/forgot-password">password recovery</Link> if you cannot sign in. Email confirmation may be required based on the configured Supabase project.</p></section>
    <section className="utility-section"><h2>Privacy and safety</h2><p>Manage your profile privacy in settings, block accounts from their profiles, and report posts for moderator review.</p></section>
    <section className="utility-section"><h2>Feature availability</h2><p>SocialSphere is still in development. Some planned features and support operations are not yet available.</p></section>
  </main>;
}
