import Link from 'next/link';

export default function SettingsPage() {
  return <main className="utility-page">
    <header><Link href="/">← Home</Link><h1>Settings</h1></header>
    <nav className="settings-links">
      <Link href="/settings/privacy"><strong>Privacy</strong><span>Set your profile to private</span></Link>
      <Link href="/settings/restrictions"><strong>Restrictions</strong><span>Review and unblock accounts</span></Link>
      <Link href="/profile/edit"><strong>Profile</strong><span>Update your public profile information</span></Link>
      <Link href="/settings/security"><strong>Account security</strong><span>Reset your password or sign out</span></Link>
    </nav>
  </main>;
}
