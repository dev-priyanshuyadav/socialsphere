'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { blockUser, unblockUser } from '@/app/actions/social';

export default function BlockButton({ userId, initiallyBlocked }: {
  userId: string;
  initiallyBlocked: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  function toggle() {
    setError('');
    startTransition(async () => {
      try {
        if (blocked) await unblockUser(userId);
        else await blockUser(userId);
        setBlocked(value => !value);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to update block settings.');
      }
    });
  }
  return <div className="block-control">
    <button className="utility-button secondary" type="button" disabled={busy} onClick={toggle}>
      {busy ? 'Please wait…' : blocked ? 'Unblock' : 'Block'}
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
