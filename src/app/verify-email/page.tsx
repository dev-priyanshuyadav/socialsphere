import Link from 'next/link';

export default function VerifyEmailPage() {
  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand">SocialSphere</Link>
    <h1>Check your inbox</h1>
    <p>Use the confirmation link from SocialSphere to verify your email address. If you have already confirmed it, you can sign in.</p>
    <Link className="utility-button" href="/login">Go to sign in</Link>
  </section></main>;
}
