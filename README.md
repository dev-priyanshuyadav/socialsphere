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
Copy-Item .env.example .env.local
# Set the Supabase URL and publishable/anon key in .env.local
npm run dev
```

Open http://localhost:3000.

## Supabase setup
1. Create a project at https://supabase.com.
2. Copy the project URL and publishable/anon key into `.env.local`.
3. Open Supabase **SQL Editor** and run `supabase/schema.sql`.
4. Run the migrations in order after the initial schema: `20261030_social_features.sql`, `20261103_private_legacy_media.sql`, and `20261104_conversation_archiving.sql`. They add social features, restrict legacy media to authorized signed URLs, and enable per-user conversation archiving.
5. In Authentication → URL Configuration, set the Site URL to your local URL during development (`http://localhost:3000`) and allow the callback URL. Add your production domain before launch.
6. In Authentication settings, choose whether email confirmation is required.
7. Start the app and register at `/signup`.

Never expose a Supabase service-role key in browser code or commit `.env.local`. The current app does not require the service-role key.

## Implemented foundation
- `/login` and `/signup` email/password flows
- Auth callback and cookie session refresh via `proxy.ts`
- Post and story uploads go directly from the signed-in browser to per-user Supabase Storage paths, avoiding serverless request-body limits
- Server Actions: create/edit/delete posts, toggle like, comments/replies, report posts, follow/unfollow and request approval for private profiles, bookmarks
- Database tables for profiles, posts, likes, comments, follows, bookmarks, stories, conversations, members, messages, notifications and reports
- Row Level Security policies; new post media uses a private, per-user `social-media-private` bucket and signed URLs; story media uses a separate private bucket
- `/api/health` health-check endpoint
- Search for discoverable profiles and public posts; saved posts and notifications
- Stories with private storage, 24-hour expiry, view recording and signed media URLs
- Video posts and a reels feed
- One-to-one/group conversation creation, realtime messages, read receipts, membership-protected history, and per-user conversation archiving
- Public communities, member feeds, and community creation/joining
- Admin report review with server-checked `app_metadata.role` and an audit log
- Password recovery and profile privacy settings
- Creator studio with measured post/follower/like/comment totals, audience and content views, and private drafts

## Current implementation status

The authenticated home feed now loads real public posts and profile details from Supabase. The existing dashboard design is retained. The composer creates database posts, image uploads are stored in the `social-media` bucket, and likes, comments and bookmarks use authenticated Server Actions. The homepage redirects signed-out visitors to `/login`.

Profile routes read Supabase records: `/profile` shows the signed-in user's profile and counts, `/profile/edit` saves validated profile changes, `/u/[username]` displays public posts, and followers/following routes list connections. Private-profile follows use approval requests. `/post/[postId]` includes comments, replies and reporting; owners can edit/delete their posts.

This is not yet a complete implementation of the requested 100 routes or production launch. Creator analytics currently report aggregate post, follower, like, and comment counts only; impressions, historical growth, demographics, scheduled publishing, and monetization are not implemented. Outstanding areas include message requests, attachments, typing indicators, and live verification of realtime behavior; complete notification event coverage; admin user suspension, broader moderation and platform settings; account deletion; 2FA; comprehensive rate limiting; and integration/RLS/E2E tests. Private-community join approvals, community events, and conversation archiving are implemented.

The initial `schema.sql` creates the legacy `social-media` bucket as public-read. Apply `supabase/migrations/20261103_private_legacy_media.sql` after the feature migration: it makes the legacy bucket private and lets the app issue one-hour signed media URLs only for posts the viewer can access. New uploads use the separate private bucket. Previously shared direct public media URLs will stop working; users should share post links instead.

This remains an integration milestone, not a production-readiness claim. Apply and review the migrations in a Supabase project before using the added features. Grant admin access only by setting the verified `role` in Supabase Auth `app_metadata` (never user-editable metadata). Before launch, test RLS and authorization with separate accounts, add rate limits, run integration/E2E tests for auth and media flows, configure backups/monitoring, and verify deployment with real credentials.

## Validation
```bash
npm run lint
npm run build
npm test
```

GitHub Actions runs lint, a production build, and the production health-endpoint smoke test for pushes to `main` and pull requests. The smoke test starts the built Next.js server locally and does not require Supabase credentials.

## Deploy to Netlify
1. Import this GitHub repository into Netlify and use the repository root as the base directory.
2. Netlify uses `netlify.toml` to run `npm run build` with Node.js 22. Netlify's Next.js adapter handles routing and server-rendered pages.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify's environment variables. Do not add `.env.local` or a service-role key; auth callback URLs use the active site origin.
4. In Supabase Authentication URL Configuration, set the production Site URL and allow the deployed callback URL `https://<your-site-domain>/auth/callback`. Add the local callback URL separately for development.
5. Deploy, then test sign-up, email confirmation, sign-in, password recovery, media access, and RLS using separate accounts. Set the final custom domain in both Netlify and Supabase before launch.

## Scripts
```bash
npm run dev
npm run lint
npm run build
npm test
npm start
```
