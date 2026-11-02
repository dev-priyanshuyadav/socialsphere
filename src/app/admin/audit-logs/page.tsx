import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  if (user.app_metadata?.role !== 'admin') redirect('/');
  const { data, error } = await supabase.from('admin_audit_logs')
    .select('id, action, target_type, target_id, created_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/admin">← Admin</Link><h1>Audit logs</h1></header>
    {data?.length ? data.map(log => <article className="utility-post" key={log.id}>
      <strong>{log.action}</strong><p>{log.target_type}{log.target_id ? ` · ${log.target_id}` : ''}</p>
      <small>{new Date(log.created_at).toLocaleString()}</small>
    </article>) : <p className="utility-empty">No admin actions have been logged.</p>}
  </main>;
}
