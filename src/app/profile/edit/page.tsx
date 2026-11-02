import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditProfileForm from './form';

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase.from('profiles')
    .select('username, display_name, bio, website')
    .eq('id', user.id)
    .single();
  if (error) throw new Error(error.message);

  return (
    <main className="profile-shell">
      <header className="profile-toolbar"><Link href="/profile">← Profile</Link></header>
      <section className="edit-profile-card">
        <h1>Edit your profile</h1>
        <p>Update how you appear to your community.</p>
        <EditProfileForm profile={profile} />
      </section>
    </main>
  );
}
