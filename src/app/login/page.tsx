'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace('/'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); }
    finally { setLoading(false); }
  }

  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}><Link href="/" className="auth-brand">SocialSphere</Link><h1>Welcome back</h1><p>Sign in to continue to your community.</p>{error && <div className="auth-error" role="alert">{error}</div>}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button><small>New to SocialSphere? <Link href="/signup">Create an account</Link></small></form></main>;
}
