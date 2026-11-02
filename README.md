# SocialSphere — Full-stack social platform starter

SocialSphere is being upgraded from a frontend prototype into a Next.js + Supabase application. The existing dashboard design is preserved. This repository now includes the Supabase integration foundation, authentication screens, server-side social mutations, a relational schema with row-level security, public feed media uploads, and a health endpoint.

## Stack
- Next.js 16, React 19, TypeScript
- Tailwind CSS v4 (existing design)
- Supabase Auth, PostgreSQL, Storage and Realtime-ready schema
- Server Actions for authenticated social mutations

## Requirements
- Node.js 20.9+
- npm
- A Supabase project

## Run locally

```bash
npm install
cp .env.example .env.local
# Set the Supabase URL/key and app URL in .env.local
npm run dev
```

Open http://localhost:3000.

## Supabase setup
1. Create a project at https://supabase.com.
2. Copy the project URL and publishable/anon key into `.env.local`.
3. Open Supabase **SQL Editor** and run `supabase/schema.sql`.
4. Run `supabase/migrations/20261030_social_features.sql` after the initial schema. It adds follow requests, privacy-aware post policies, stories storage, communities, conversation creation, report review, and related RLS policies.
5. In Authentication → URL Configuration, set the Site URL to your local URL during development (`http://localhost:3000`) and allow the callback URL. Add your production domain before launch.
6. In Authentication settings, choose whether email confirmation is required.
7. Start the app and register at `/signup`.

Never expose a Supabase service-role key in browser code or commit `.env.local`. The service-role placeholder is server-only and is not needed by the currently implemented features.

## Implemented foundation
- `/login` and `/signup` email/password flows
- Auth callback and cookie session refresh via `proxy.ts`
- Server Actions: create/edit/delete posts, toggle like, comments/replies, report posts, follow/unfollow and request approval for private profiles, bookmarks
- Database tables for profiles, posts, likes, comments, follows, bookmarks, stories, conversations, members, messages, notifications and reports
- Row Level Security policies; new post media uses a private, per-user `social-media-private` bucket and signed URLs; story media uses a separate private bucket
- `/api/health` health-check endpoint
- Search for discoverable profiles and public posts; saved posts and notifications
- Stories with private storage, 24-hour expiry, view recording and signed media URLs
- Video posts and a reels feed
- One-to-one/group conversation creation and membership-protected message history
- Public communities, member feeds, and community creation/joining
- Admin report review with server-checked `app_metadata.role` and an audit log
- Password recovery and profile privacy settings
- Creator studio with measured post/follower/like/comment totals, audience and content views, and private drafts

## Current implementation status

The authenticated home feed now loads real public posts and profile details from Supabase. The existing dashboard design is retained. The composer creates database posts, image uploads are stored in the `social-media` bucket, and likes, comments and bookmarks use authenticated Server Actions. The homepage redirects signed-out visitors to `/login`.

Profile routes read Supabase records: `/profile` shows the signed-in user's profile and counts, `/profile/edit` saves validated profile changes, `/u/[username]` displays public posts, and followers/following routes list connections. Private-profile follows use approval requests. `/post/[postId]` includes comments, replies and reporting; owners can edit/delete their posts.

This is not yet a complete implementation of the requested 100 routes or production launch. Creator analytics currently report aggregate post, follower, like, and comment counts only; impressions, historical growth, demographics, scheduled publishing, and monetization are not implemented. Outstanding areas include message requests, archiving, attachments, typing indicators, and live verification of realtime behavior; private community approval and events workflows; complete notification event coverage; admin user suspension, broader moderation and platform settings; account deletion; 2FA; comprehensive rate limiting; and unit/integration/RLS/E2E tests.

The initial `schema.sql` creates the legacy `social-media` bucket as public-read. The feature migration creates separate private buckets for new post uploads and stories. Old files already stored in the legacy public bucket remain publicly accessible; migrate those objects and update post paths if they must become private.

This remains an integration milestone, not a production-readiness claim. Apply and review the migration in a Supabase project before using the added features. Grant admin access only by setting the verified `role` in Supabase Auth `app_metadata` (never user-editable metadata). Before launch, test RLS and authorization with separate accounts, add rate limits, test auth/media flows, add automated tests, configure backups/monitoring, and verify deployment with real credentials.

## Next milestones
1. Complete core privacy controls and blocked-user behavior.
2. Add realtime messaging, message requests/archive/read receipts, and private attachments.
3. Implement community events and private community invitations/approvals.
4. Expand creator tools and implement admin user/moderation workflows and remaining notification events.
5. Add automated unit/integration/RLS/E2E tests, rate limits, CI, monitoring, backups, and production domain configuration.

## Scripts
```bash
npm run dev
npm run lint
npm run build
npm start
```
