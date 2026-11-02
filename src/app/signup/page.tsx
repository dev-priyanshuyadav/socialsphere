'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState(''); const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`, data: { display_name: name, username: username.toLowerCase() } } });
      if (error) throw error;
      if (data.session) { router.replace('/onboarding'); router.refresh(); }
      else setMessage('Check your email to confirm your account, then sign in.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create account.'); }
    finally { setLoading(false); }
  }
  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}><Link href="/" className="auth-brand">SocialSphere</Link><h1>Create your account</h1><p>Find your people and start sharing.</p>{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-success" role="status">{message}</div>}<label>Full name<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label>Username<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" value={username} onChange={e => setUsername(e.target.value)} /></label><label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button><small>Already have an account? <Link href="/login">Sign in</Link></small></form></main>;
}
