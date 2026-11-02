import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reviewReport } from '../../actions';

export default async function AdminReportDetail({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  if (user.app_metadata?.role !== 'admin') redirect('/');
  const { data: report, error } = await supabase.from('reports')
    .select('id, reason, status, created_at, post_id, reported_user_id, reporter:profiles!reports_reporter_id_fkey(username)')
    .eq('id', reportId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) notFound();
  const reporter = Array.isArray(report.reporter) ? report.reporter[0] : report.reporter;
  return <main className="utility-page">
    <header><Link href="/admin/reports">← Reports</Link><h1>Report review</h1></header>
    <article className="utility-post">
      <strong>Reported by {reporter?.username ? `@${reporter.username}` : 'unavailable user'}</strong>
      <p>{report.reason}</p><small>Status: {report.status}</small>
      {report.post_id && <p><Link href={`/post/${report.post_id}`}>Open reported post</Link></p>}
      <form className="report-actions" action={reviewReport}>
        <input type="hidden" name="report_id" value={report.id} />
        <button className="utility-button" name="status" value="reviewing">Mark reviewing</button>
        <button className="utility-button" name="status" value="resolved">Resolve</button>
        <button className="utility-button secondary" name="status" value="dismissed">Dismiss</button>
      </form>
    </article>
  </main>;
}
