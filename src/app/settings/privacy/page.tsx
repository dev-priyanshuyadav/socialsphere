import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updatePrivacy } from './action';

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase.from('profiles').select('is_private').eq('id', user.id).single();
  if (error) throw new Error(error.message);

  return <main className="utility-page">
    <header><Link href="/settings">← Settings</Link><h1>Privacy</h1></header>
    <section className="privacy-setting">
      <div><h2>Private profile</h2><p>Only approved followers can view posts. New followers must be approved before they are added.</p></div>
      <form action={updatePrivacy}>
        <label><input type="checkbox" name="is_private" defaultChecked={profile.is_private} /> Make my profile private</label>
        <button className="utility-button">Save privacy settings</button>
      </form>
    </section>
  </main>;
}
