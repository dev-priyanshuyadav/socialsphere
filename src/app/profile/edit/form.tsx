'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/actions/profile';

type ProfileFormValues = {
  username: string;
  display_name: string;
  bio: string | null;
  website: string | null;
};

export default function EditProfileForm({ profile }: { profile: ProfileFormValues }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateProfile(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.replace('/profile');
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to update your profile.');
      }
    });
  }

  return (
    <form className="edit-profile-form" onSubmit={submit}>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <label>Display name<input name="display_name" required maxLength={80} defaultValue={profile.display_name} /></label>
      <label>Username<input name="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" defaultValue={profile.username} /></label>
      <label>Bio<textarea name="bio" maxLength={300} rows={4} defaultValue={profile.bio ?? ''} /></label>
      <label>Website<input name="website" type="url" placeholder="https://" defaultValue={profile.website ?? ''} /></label>
      <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}
