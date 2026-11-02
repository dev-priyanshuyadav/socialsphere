import Link from 'next/link';

export default function PublicInfoPage({ title, intro, sections }: {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return <main className="utility-page public-info">
    <header><Link href="/">SocialSphere</Link><Link href="/signup">Create an account →</Link></header>
    <section className="public-info-hero"><span>YOUR COMMUNITY, YOUR SPACE</span><h1>{title}</h1><p>{intro}</p></section>
    {sections.map(section => <section className="utility-section" key={section.heading}>
      <h2>{section.heading}</h2><p>{section.body}</p>
    </section>)}
    <footer><Link href="/help">Help</Link><Link href="/guidelines">Community guidelines</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
  </main>;
}
