import PublicInfoPage from '@/app/components/PublicInfoPage';

export const metadata = { title: 'Terms | SocialSphere' };
export default function TermsPage() {
  return <PublicInfoPage title="Terms of service" intro="Draft terms summary — this page is informational and is not a final legal agreement. Obtain legal review before public launch." sections={[
    { heading: 'Using the service', body: 'Use SocialSphere lawfully, respect other people, and do not attempt to bypass account, privacy, or moderation controls.' },
    { heading: 'Your content', body: 'You remain responsible for content you submit and must have the rights needed to share it. You should not upload unlawful or harmful material.' },
    { heading: 'Availability', body: 'The application is under development. Features may change, and no service availability commitment is made by this draft.' },
    { heading: 'Contact and legal review', body: 'These draft statements do not establish jurisdiction, dispute terms, warranties, or limitation-of-liability provisions. Have qualified counsel prepare final terms.' },
  ]} />;
}
