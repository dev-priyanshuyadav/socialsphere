import ConnectionsPage from '../connections';

export default function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  return <ConnectionsPage params={params} mode="followers" />;
}
