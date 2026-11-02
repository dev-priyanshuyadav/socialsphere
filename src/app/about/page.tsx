import PublicInfoPage from '@/app/components/PublicInfoPage';

export const metadata = { title: 'About SocialSphere' };
export default function AboutPage() {
  return <PublicInfoPage title="A more thoughtful place to connect" intro="SocialSphere is a community-first social platform for sharing ideas, moments, and interests with the people who matter to you." sections={[
    { heading: 'Built around people', body: 'Profiles, posts, conversations, and communities are designed to make it easier to find your people and take part in conversations that matter.' },
    { heading: 'Privacy matters', body: 'Account privacy controls and server-enforced access policies are part of the platform foundation. Review the privacy page before using the service.' },
    { heading: 'A work in progress', body: 'SocialSphere is actively being developed. Some planned capabilities are not available yet, and the service is not represented as production-ready.' },
  ]} />;
}
