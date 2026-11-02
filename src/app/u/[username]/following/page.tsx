import ConnectionsPage from '../connections';

export default function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  return <ConnectionsPage params={params} mode="following" />;
}
