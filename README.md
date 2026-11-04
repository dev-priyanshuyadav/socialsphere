# SocialSphere

> A full-stack social platform for sharing moments, building communities, and staying connected.

[![CI](https://github.com/dev-priyanshuyadav/socialsphere/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-priyanshuyadav/socialsphere/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-live-0ea5a4)](https://socialsphere-priyanshuyadav.netlify.app)

**Live app:** [socialsphere-priyanshuyadav.netlify.app](https://socialsphere-priyanshuyadav.netlify.app) · **Source:** [github.com/dev-priyanshuyadav/socialsphere](https://github.com/dev-priyanshuyadav/socialsphere)

SocialSphere is a Next.js and Supabase social application designed around a familiar, mobile-friendly feed. It brings together profiles, posts, stories, messaging, communities, and creator tools, with authenticated server actions and database-enforced access controls behind the interface.

> **Project status:** Deployed for hands-on testing, not yet production-ready. Core routes and the health endpoint are live. Email confirmation is enabled in Supabase, but custom SMTP delivery has not been configured; complete signup, authorization, privacy, and media testing before inviting users.

## Case study

### The challenge

The project began as a social dashboard prototype. Turning it into a usable full-stack product meant connecting the interface to real identity and data, protecting user-generated content, and supporting social interactions without losing a responsive, recognizable feed experience.

### The approach

- Built the application with the Next.js App Router, React, and TypeScript.
- Connected authentication, Postgres, storage, and realtime-ready features to Supabase.
- Kept privileged mutations on the server and used Supabase Row Level Security (RLS) to enforce access at the data layer.
- Redesigned the home feed around stories, post cards, familiar actions, persistent navigation, and responsive mobile navigation.
- Moved post and story file transfers to direct, authenticated browser-to-Supabase uploads to avoid serverless request-body limits.
- Added CI, a production health check, Netlify configuration, and ordered database migrations.

### Product highlights

| Area | What is implemented |
| --- | --- |
| Identity | Email/password signup and login, auth callback, password recovery, profile editing, and privacy settings |
| Feed | Public posts, likes, comments and replies, bookmarks, reporting, and owner edit/delete actions |
| Stories and media | Expiring stories, view recording, video posts, reels, private storage, and signed media URLs |
| Connections | Follow/unfollow and approval requests for private profiles |
| Messaging | One-to-one and group conversations, realtime-ready messages, read receipts, membership-protected history, and per-user archiving |
| Communities | Community discovery and creation, member feeds, private-community join approvals, and events |
| Creator tools | Drafts and aggregate post, follower, like, and comment analytics |
| Moderation | Report review and audit logging, with admin access checked against trusted Supabase `app_metadata` |

### Engineering decisions

- **Authorization at the data layer:** RLS policies are the foundation for protecting profiles, posts, conversations, and storage objects; UI visibility alone is not treated as an access control.
- **Private media by default:** New post and story uploads use private storage paths. Authorized media is delivered through short-lived signed URLs. The legacy-media migration also changes the old public bucket to private.
- **Smaller server requests:** Browsers upload media directly to Supabase Storage; the server validates ownership and records the media path with the post or story.
- **Incremental schema changes:** Database evolution is captured in ordered SQL migrations after the base schema.
- **Continuous verification:** GitHub Actions runs lint, a production build, and the health endpoint smoke test for pushes and pull requests.

## Technology

- **Application:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4 and project-specific responsive styles
- **Backend:** Supabase Auth, PostgreSQL, Row Level Security, Storage, and Realtime
- **Hosting:** Netlify
- **Automation:** GitHub Actions, ESLint, and Node.js test runner

## Run locally

### Prerequisites

- Node.js 20.9 or later
- npm
- A Supabase project

### 1. Install and configure

```bash
npm install
```

Copy `.env.example` to `.env.local` and set the following values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the project's publishable/anon key only. **Never put a Supabase service-role key in browser code or commit `.env.local`.**

### 2. Initialize the database

In the Supabase SQL Editor, run `supabase/schema.sql`, then apply these migrations in order:

1. `supabase/migrations/20261030_social_features.sql`
2. `supabase/migrations/20261103_private_legacy_media.sql`
3. `supabase/migrations/20261104_conversation_archiving.sql`

The media migration makes the legacy `social-media` bucket private and converts existing public object URLs to storage paths. Old direct public media URLs will no longer work; share post links instead.

### 3. Configure Auth and start

In Supabase **Authentication → URL Configuration**:

- Set the local Site URL to `http://localhost:3000`.
- Allow `http://localhost:3000/**` and, if using it locally, `http://127.0.0.1:3000/**`.
- Keep the production Site URL and redirect allowlist configured for the deployed domain.

Email confirmation is enabled on the hosted project. Custom SMTP is not configured yet, so confirmation email delivery may not work until a mail provider is set up.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account at `/signup`, or sign in at `/login`.

## Validation

Run the same checks used in CI:

```bash
npm run lint
npm run build
npm test
```

The production smoke test starts a built Next.js server and checks `/api/health`; it does not require Supabase credentials. ESLint currently reports existing warnings for image elements and the PostCSS config, but no lint errors.

## Deployment

The current deployment is hosted at [socialsphere-priyanshuyadav.netlify.app](https://socialsphere-priyanshuyadav.netlify.app). Netlify builds the `main` branch using `netlify.toml` and the Next.js runtime.

Required Netlify environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Set both for the appropriate deploy contexts in Netlify. Never add `.env.local` or a service-role key. In Supabase Auth URL Configuration, use the deployed site as the Site URL and allow `https://socialsphere-priyanshuyadav.netlify.app/**` as a redirect URL. Add your custom domain there as well if one is configured.

## Current limitations and next steps

This deployment is a testable milestone, not a production-readiness claim. Areas still needing implementation or verification include:

- Configure a custom SMTP provider and verify signup, confirmation, and password recovery email delivery.
- Test RLS, account privacy, storage ownership, and authorization with separate user accounts.
- Run end-to-end checks for signup, sign-in, posting, uploads, messaging, and mobile layouts.
- Verify realtime behavior against the live project and broaden notification event coverage.
- Add message requests and attachments, account deletion, two-factor authentication, rate limiting, monitoring, and backup guidance.
- Expand creator analytics beyond aggregate counts; scheduling and monetization are not implemented.
- Add admin user suspension and broader moderation/platform controls.

Monetization is intentionally deferred.

## Useful routes

`/login` · `/signup` · `/search` · `/profile` · `/messages` · `/communities` · `/creator` · `/api/health`

## License

No license has been specified yet. All rights remain with the project author unless a license is added to this repository.
