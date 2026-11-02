import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) redirect('/login');
  return <main className="utility-page">
    <header><Link href="/settings">← Settings</Link><h1>Account security</h1></header>
    <section className="privacy-setting">
      <div><h2>Password and session</h2><p>Reset your password by email or sign out of this session.</p></div>
      <div className="security-actions">
        <Link className="utility-button secondary" href="/forgot-password">Reset password</Link>
        <form action={signOut}><button className="utility-button">Sign out</button></form>
      </div>
    </section>
  </main>;
}
