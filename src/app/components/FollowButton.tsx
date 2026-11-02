'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFollow } from '@/app/actions/social';

export default function FollowButton({ userId, initiallyFollowing, initiallyRequested = false }: {
  userId: string;
  initiallyFollowing: boolean;
  initiallyRequested?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [requested, setRequested] = useState(initiallyRequested);
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();

  function toggle() {
    setError('');
    startTransition(async () => {
      try {
        const result = await toggleFollow(userId);
        setFollowing(result.following);
        setRequested(result.requested);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to update follow status.');
      }
    });
  }

  return (
    <div className="follow-control">
      <button className={following ? 'profile-follow following' : 'profile-follow'} onClick={toggle} disabled={busy}>
        {busy ? 'Please wait…' : following ? 'Following' : requested ? 'Requested' : 'Follow'}
      </button>
      {error && <span className="follow-error" role="alert">{error}</span>}
    </div>
  );
}
