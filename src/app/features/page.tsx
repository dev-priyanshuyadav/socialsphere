import PublicInfoPage from '@/app/components/PublicInfoPage';

export const metadata = { title: 'Features | SocialSphere' };
export default function FeaturesPage() {
  return <PublicInfoPage title="Share, discover, and belong" intro="The current SocialSphere app includes a working foundation for social posting and community interaction." sections={[
    { heading: 'Posts and profiles', body: 'Create text, image, and short video posts, edit your profile, follow public profiles, and manage private-profile follow requests.' },
    { heading: 'Stories and video', body: 'Share expiring image or video stories and browse video posts in the reels feed.' },
    { heading: 'Conversations and communities', body: 'Start private or group conversations and create or join communities with member feeds and events.' },
    { heading: 'What is still being built', body: 'Realtime messaging, advanced analytics, broader admin tooling, and other features described in the product roadmap are not complete.' },
  ]} />;
}
