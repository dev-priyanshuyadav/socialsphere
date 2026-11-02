'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your password. Open a fresh reset link and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <Link href="/login" className="auth-brand">SocialSphere</Link>
    <h1>Choose a new password</h1><p>Use at least 8 characters.</p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {success ? <div className="auth-success" role="status">Your password has been updated. <Link href="/login">Sign in</Link></div> : <>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
      <small><Link href="/forgot-password">Request another reset link</Link></small>
    </>}
  </form></main>;
}
