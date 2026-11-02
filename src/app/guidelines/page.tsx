import PublicInfoPage from '@/app/components/PublicInfoPage';

export const metadata = { title: 'Community guidelines | SocialSphere' };
export default function GuidelinesPage() {
  return <PublicInfoPage title="Community guidelines" intro="Help keep SocialSphere welcoming, safe, and useful for everyone." sections={[
    { heading: 'Treat people with respect', body: 'Do not harass, threaten, target, or disclose private information about other people.' },
    { heading: 'Share responsibly', body: 'Only post content you have permission to share. Do not impersonate people or mislead the community.' },
    { heading: 'Report harmful content', body: 'Use the report action on a post to flag content for review. Reports are private to the reporter and authorized moderators.' },
    { heading: 'Moderation', body: 'Moderation tools are under active development. These guidelines are not a substitute for emergency services or legal advice.' },
  ]} />;
}
