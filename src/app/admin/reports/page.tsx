import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  if (user.app_metadata?.role !== 'admin') redirect('/');
  const { data, error } = await supabase.from('reports')
    .select('id, reason, status, created_at, post_id, reporter:profiles!reports_reporter_id_fkey(username)')
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/admin">← Admin</Link><h1>Reports</h1></header>
    {data?.length ? data.map(report => {
      const reporter = Array.isArray(report.reporter) ? report.reporter[0] : report.reporter;
      return <Link className="utility-post report-list-item" href={`/admin/reports/${report.id}`} key={report.id}>
        <strong>{report.status} · {reporter?.username ? `@${reporter.username}` : 'Account unavailable'}</strong>
        <p>{report.reason}</p><small>{new Date(report.created_at).toLocaleString()}</small>
      </Link>;
    }) : <p className="utility-empty">No reports have been filed.</p>}
  </main>;
}
