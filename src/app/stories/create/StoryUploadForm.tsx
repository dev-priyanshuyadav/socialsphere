'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createStory } from '@/app/actions/stories';
import { createClient } from '@/lib/supabase/client';
import { uploadMediaFile } from '@/lib/supabase/uploads';

export default function StoryUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('Choose a photo or video.');
      return;
    }
    if (caption.trim().length > 500) {
      setError('Story captions must be 500 characters or fewer.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('You must be signed in to share a story.');
      const uploaded = await uploadMediaFile(supabase, user.id, file, 'story-media');
      const storyId = await createStory(uploaded.path, uploaded.mediaType, caption);
      router.push(`/stories/${storyId}`);
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to share this story.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return <form className="edit-profile-form community-form" onSubmit={submit}>
    {error && <p role="alert" className="auth-error">{error}</p>}
    <label>Photo or video<input
      type="file"
      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
      required
      onChange={event => setFile(event.target.files?.[0] ?? null)}
    /></label>
    <label>Caption<textarea rows={3} maxLength={500} value={caption} onChange={event => setCaption(event.target.value)} /></label>
    <button className="utility-button" disabled={busy}>{busy ? 'Uploading…' : 'Share story'}</button>
  </form>;
}
