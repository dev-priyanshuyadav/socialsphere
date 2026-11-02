import Link from 'next/link';

export const metadata = { title: 'Contact | SocialSphere' };
export default function ContactPage() {
  return <main className="utility-page public-info">
    <header><Link href="/">SocialSphere</Link><Link href="/help">Help center →</Link></header>
    <section className="public-info-hero"><span>CONTACT</span><h1>Get in touch</h1><p>SocialSphere is in development and does not yet have a configured support inbox.</p></section>
    <section className="utility-section"><h2>Safety reports</h2><p>Signed-in users can report a post using the report action on its detail page. Reports are visible to authorized administrators.</p></section>
    <section className="utility-section"><h2>Account questions</h2><p>For now, use the account recovery flow for sign-in issues. Configure an official support address before inviting the public to use this service.</p></section>
  </main>;
}
