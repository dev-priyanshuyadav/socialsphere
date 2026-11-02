import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteDraft, saveDraft } from '../actions';

export default async function CreatorDraftsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) redirect('/login');
  const { data, error } = await supabase.from('post_drafts')
    .select('id, content, created_at').eq('author_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return <main className="utility-page">
    <header><Link href="/creator">← Creator studio</Link><h1>Drafts</h1></header>
    <form className="chat-compose edit-post-form" action={saveDraft}>
      <textarea name="content" maxLength={5000} rows={4} placeholder="Save an idea for a post..." />
      <button className="utility-button">Save draft</button>
    </form>
    {data?.length ? data.map(draft => <article className="utility-post" key={draft.id}>
      <p>{draft.content || 'Empty draft'}</p><small>{new Date(draft.created_at).toLocaleString()}</small>
      <form action={deleteDraft}><input type="hidden" name="draft_id" value={draft.id} /><button className="utility-button secondary">Delete draft</button></form>
    </article>) : <p className="utility-empty">No drafts yet.</p>}
  </main>;
}
