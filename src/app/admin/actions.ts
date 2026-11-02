'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function reviewReport(formData: FormData) {
  const reportId = String(formData.get('report_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!reportId || !['reviewing', 'resolved', 'dismissed'].includes(status)) throw new Error('Invalid report update.');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  if (user.app_metadata?.role !== 'admin') throw new Error('Administrator access is required.');
  const { error } = await supabase.rpc('review_report', { target_report_id: reportId, new_status: status });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/reports');
  revalidatePath(`/admin/reports/${reportId}`);
}
