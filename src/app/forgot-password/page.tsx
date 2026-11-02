'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage('If an account exists for this address, a password reset link is on its way.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send a password reset email.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <Link href="/login" className="auth-brand">SocialSphere</Link>
    <h1>Reset your password</h1><p>We&apos;ll email you a secure password reset link.</p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {message && <div className="auth-success" role="status">{message}</div>}
    <label>Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
    <button disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
    <small><Link href="/login">Return to sign in</Link></small>
  </form></main>;
}
