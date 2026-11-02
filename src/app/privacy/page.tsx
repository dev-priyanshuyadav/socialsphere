import PublicInfoPage from '@/app/components/PublicInfoPage';

export const metadata = { title: 'Privacy | SocialSphere' };
export default function PrivacyPage() {
  return <PublicInfoPage title="Privacy overview" intro="Draft privacy summary — finalize this notice against actual data flows and applicable law before launching the service." sections={[
    { heading: 'Account information', body: 'The current app stores account profiles, posts, comments, follows, messages, stories, and related activity in Supabase when a project is configured.' },
    { heading: 'Visibility', body: 'Public posts and profiles may be discoverable. Private profiles restrict post visibility and require follow approval. Private story media uses signed access URLs.' },
    { heading: 'Retention and controls', body: 'Stories are marked to expire after 24 hours, but automated media cleanup is not configured. Account deletion and complete data export are not implemented yet.' },
    { heading: 'Before launch', body: 'A final policy must describe processors, retention, cookies, user rights, contact details, and jurisdiction-specific disclosures. This page is not legal advice.' },
  ]} />;
}
