import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditProfileForm from '@/app/profile/edit/form';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase.from('profiles')
    .select('username, display_name, bio, website').eq('id', user.id).single();
  if (error) throw new Error(error.message);
  return <main className="utility-page onboarding-page">
    <header><Link href="/">SocialSphere</Link></header>
    <section className="edit-profile-card">
      <div className="public-info-hero"><span>WELCOME TO SOCIALSPHERE</span><h1>Make your profile yours</h1><p>Add the details people will see when they find you.</p></div>
      <EditProfileForm profile={profile} />
      <Link href="/">Skip for now</Link>
    </section>
  </main>;
}
