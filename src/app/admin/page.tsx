import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  if (user.app_metadata?.role !== 'admin') redirect('/');
  const { count, error } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open');
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/">← Home</Link><h1>Administration</h1></header>
    <section className="settings-links">
      <Link href="/admin/reports"><strong>Open reports: {count ?? 0}</strong><span>Review user-submitted reports and update their status.</span></Link>
      <Link href="/admin/audit-logs"><strong>Audit log</strong><span>View recorded administrative actions.</span></Link>
    </section>
  </main>;
}
