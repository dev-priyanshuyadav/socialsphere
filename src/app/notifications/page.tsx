import Link from 'next/link';
import { redirect } from 'next/navigation';
import { acceptFollowRequest, getNotifications, markNotificationsRead, rejectFollowRequest } from '@/app/actions/social';

const descriptions: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  follow_request: 'requested to follow you',
  follow_request_accepted: 'accepted your follow request',
  message: 'sent you a message',
  mention: 'mentioned you',
  community_invite: 'invited you to a community',
  moderation: 'sent you a moderation update',
};

export default async function NotificationsPage() {
  let data;
  try {
    data = await getNotifications();
  } catch (error) {
    if (error instanceof Error && error.message.includes('signed in')) redirect('/login');
    throw error;
  }

  return (
    <main className="utility-page">
      <header className="utility-header"><div><Link href="/">← Home</Link><h1>Notifications</h1></div>
        <div className="security-actions"><Link href="/notifications/settings">Settings</Link><form action={markNotificationsRead}><button className="utility-button">Mark all read</button></form></div>
      </header>
      <section className="utility-section"><h2>Follow requests</h2>
        {data.requests.length ? data.requests.map(request => {
          const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
          if (!requester) return null;
          return <article className="notification-row" key={request.id}>
            <img src={requester.avatar_url ?? '/avatar-placeholder.svg'} alt="" />
            <p><Link href={`/u/${requester.username}`}>{requester.display_name}</Link> requested to follow you.</p>
            <form action={acceptFollowRequest.bind(null, request.id)}><button className="utility-button">Accept</button></form>
            <form action={rejectFollowRequest.bind(null, request.id)}><button className="utility-button secondary">Decline</button></form>
          </article>;
        }) : <p className="utility-empty">No pending follow requests.</p>}
      </section>
      <section className="utility-section"><h2>Recent activity</h2>
        {data.notifications.length ? data.notifications.map(notification => {
          const actor = Array.isArray(notification.actor) ? notification.actor[0] : notification.actor;
          return <article className={`notification-row ${notification.read_at ? '' : 'unread'}`} key={notification.id}>
            <p>{actor ? <Link href={`/u/${actor.username}`}>{actor.display_name}</Link> : 'Someone'} {descriptions[notification.type] ?? 'interacted with you'}.</p>
            {notification.post_id && <Link href={`/#post-${notification.post_id}`}>View post</Link>}
            <time>{new Date(notification.created_at).toLocaleString()}</time>
          </article>;
        }) : <p className="utility-empty">Your activity notifications will appear here.</p>}
      </section>
    </main>
  );
}
