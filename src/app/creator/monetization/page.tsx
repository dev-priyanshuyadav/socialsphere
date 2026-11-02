import Link from 'next/link';

export default function CreatorMonetizationPage() {
  return <main className="utility-page">
    <header><Link href="/creator">← Creator studio</Link><h1>Monetization</h1></header>
    <section className="utility-section">
      <h2>Not available</h2>
      <p>Monetization is disabled. Payment processing, eligibility checks, tax workflows, and compliance have not been implemented.</p>
    </section>
  </main>;
}
