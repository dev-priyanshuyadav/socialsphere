import Link from 'next/link';
import { redirect } from 'next/navigation';
import { saveNotificationPreferences } from '@/app/actions/social';
import { createClient } from '@/lib/supabase/server';

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('notification_preferences')
    .select('likes, comments, follows, messages').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/notifications">← Notifications</Link><h1>Notification preferences</h1></header>
    <form className="notification-preferences" action={saveNotificationPreferences}>
      <label><input type="checkbox" name="likes" defaultChecked={data?.likes ?? true} /> Likes</label>
      <label><input type="checkbox" name="comments" defaultChecked={data?.comments ?? true} /> Comments and replies</label>
      <label><input type="checkbox" name="follows" defaultChecked={data?.follows ?? true} /> Follows and follow requests</label>
      <label><input type="checkbox" name="messages" defaultChecked={data?.messages ?? true} /> Messages</label>
      <button className="utility-button">Save preferences</button>
    </form>
  </main>;
}
