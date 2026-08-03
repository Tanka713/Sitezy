# Sitezy

Sitezy is an AI website builder with a public marketing site, authenticated studio, visual editor, structured settings, Supabase-backed persistence, shared media storage, an in-product support inbox, and ZIP export.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Supabase Auth, Postgres, and Storage
- Anthropic API
- JSZip

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Optional variables:

```env
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SITEZY_WORKER_SECRET=replace-with-a-long-random-secret
SITEZY_INTERNAL_BASE_URL=http://127.0.0.1:3000
SITEZY_AI_PROVIDER=anthropic
SITEZY_SPARK_KEY=your-sitezy-spark-key
SITEZY_SPARK_MODEL=claude-sonnet-4-20250514
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
SITEZY_GENERATION_MODE=efficient
SITEZY_STREAM_MAX_TOKENS=9000
SITEZY_JSON_MAX_TOKENS=3000
SITEZY_BETA_MODE=invite-only
SITEZY_BETA_ALLOWLIST=founder@example.com,designer@example.com
SITEZY_BETA_DENIED_MESSAGE=This private beta is currently limited to invited accounts.
SITEZY_SUPPORT_EMAIL=support@sitezy.app
RESEND_API_KEY=re_xxxxxxxxx
SITEZY_SUPPORT_FROM_EMAIL=support@updates.sitezy.app
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for admin and customer-service internal dashboards, beta invite management, and permanent account deletion.
- `SUPABASE_SERVICE_ROLE_KEY` also enables the built-in server-side generation daemon so full-site generation keeps running after refresh, tab close, or sign-out.
- `SITEZY_WORKER_SECRET` plus `npm run worker:project-generation` are optional when you want a separate dedicated worker process.
- `SITEZY_INTERNAL_BASE_URL` should point the standalone worker at the running app server. For local dev, `http://127.0.0.1:3000` is the default.
- `SITEZY_SPARK_*` is an alias supported by the AI service layer.
- `SITEZY_BETA_*` and `SITEZY_SUPPORT_EMAIL` are optional launch controls for invite-only beta access and support messaging.
- `RESEND_API_KEY` plus `SITEZY_SUPPORT_FROM_EMAIL` enable customer-service reply emails from the internal support dashboard.

### 3. Apply Supabase SQL

Choose the SQL path that matches your database state:

- Fresh setup or full reset:
  - [`supabase/reset-from-scratch.sql`](./supabase/reset-from-scratch.sql)
- Core project schema with settings and support:
  - [`supabase/schema.sql`](./supabase/schema.sql)
- Existing database upgrade for shared media and storage:
  - [`supabase/add-user-media.sql`](./supabase/add-user-media.sql)
- Existing database upgrade for persisted user settings:
  - [`supabase/add-user-settings.sql`](./supabase/add-user-settings.sql)
- Existing database upgrade for beta access, internal roles, and invite-only gating:
  - [`supabase/add-beta-access.sql`](./supabase/add-beta-access.sql)
- Existing database upgrade for blocked-account beta interest capture:
  - [`supabase/add-beta-interest-requests.sql`](./supabase/add-beta-interest-requests.sql)
- Existing database upgrade for support requests:
  - [`supabase/add-support-requests.sql`](./supabase/add-support-requests.sql)
- Existing database upgrade for support reply threads:
  - [`supabase/add-support-request-replies.sql`](./supabase/add-support-request-replies.sql)
- Existing database upgrade for support ticket numbers:
  - [`supabase/add-support-ticket-numbers.sql`](./supabase/add-support-ticket-numbers.sql)
- Existing database upgrade for background generation jobs:
  - [`supabase/add-project-generation-jobs.sql`](./supabase/add-project-generation-jobs.sql)

Notes:

- `reset-from-scratch.sql` includes projects, pages, files, user settings, user media, support requests, the project save RPC, RLS policies, and `sitezy-media` bucket setup.
- `schema.sql` is the canonical core schema for projects, settings, support, and the `save_project_snapshot(...)` RPC.
- `add-user-media.sql` is still required if you are upgrading an older database to the shared media system.

In Supabase Auth settings:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- Enable the Google and GitHub providers if you want OAuth login/signup in the product.
- Configure each provider's client ID and secret in Supabase Auth, then point their OAuth callback/redirect back to your Supabase project as required by Supabase.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `SUPABASE_SERVICE_ROLE_KEY` is present, the app server now drains full-site generation jobs on its own.

Run the background worker in a second terminal only if you want a separate dedicated worker process:

```bash
npm run worker:project-generation
```

## Product Surface

Public routes:

- `/`
- `/login`
- `/signup`
- `/reset-password`
- `/privacy`
- `/terms`
- `/support`

Protected app routes:

- `/app`
- `/studio`
- `/settings`
- `/preview/[projectId]`
- `/admin`
- `/customer-service`
- `/beta/access-needed`

Core product capabilities:

- AI brief to blueprint flow
- Streaming page generation
- Section regeneration and block insertion
- Visual editor with preview, split, and code modes
- Shared account-level media library backed by Supabase Storage
- Persisted workspace and product settings
- In-product support inbox backed by Supabase
- ZIP export and preview-frame rendering

## API Surface

AI generation:

- `POST /api/blueprint`
- `POST /api/generate`
- `POST /api/add-page`
- `POST /api/regenerate-section`
- `POST /api/insert-block`
- `POST /api/assist`
- `POST /api/intelligence`

Persistence and assets:

- `GET, POST /api/projects`
- `GET, PUT, DELETE /api/projects/[id]`
- `GET, POST /api/media`
- `PATCH, DELETE /api/media/[id]`

Settings and support:

- `GET, PUT, DELETE /api/settings`
- `DELETE /api/settings/account`
- `GET, POST /api/support`
- `GET, POST /api/admin/invites`
- `PATCH /api/admin/invites/[id]`
- `GET /api/customer-service/support`
- `PATCH, POST /api/customer-service/support/[id]`

Preview and export:

- `GET /api/preview-frame`
- `POST /api/export`
- `POST /api/map-resolve`

Background generation:

- `POST /api/projects/[id]/generation`
- `GET /api/projects/[id]/generation`
- `POST /api/internal/project-generation/step`

## Persistence Notes

- Projects are persisted in Supabase, not local SQLite.
- Project saves go through `public.save_project_snapshot(...)`.
- User settings are stored in `public.user_settings`.
- Shared media records are stored in `public.user_media`, while binary assets live in the `sitezy-media` storage bucket.
- Invite-only beta access and internal roles are stored in `public.beta_access`.
- Blocked-account interest capture is stored in `public.beta_interest_requests`.
- Support requests are stored in `public.support_requests`.
- Support reply threads are stored in `public.support_request_replies`.
- Support ticket numbers are stored in `public.support_requests.ticket_number`.
- Background generation jobs are stored in `public.project_generation_jobs`.
- `public.beta_access` uses a unique normalized email index on `lower(email)`. Invite writes should resolve the existing record first, then do an explicit `insert` or `update`. Do not rely on `upsert(..., { onConflict: "email" })` against this schema.
- The browser still keeps a small amount of local state for UX:
  - `sitezy-last-project-id`
  - `sitezy-user-settings-cache`

## Documentation Map

Start here:

- [`docs/index.md`](./docs/index.md)
- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/backend-and-data.md`](./docs/backend-and-data.md)
- [`docs/frontend-and-theming.md`](./docs/frontend-and-theming.md)
- [`docs/development.md`](./docs/development.md)

Existing deep-dive docs:

- [`docs/media-gallery-system.md`](./docs/media-gallery-system.md)
- [`docs/error-handling-audit.md`](./docs/error-handling-audit.md)
- [`docs/element-settings-coverage-audit.md`](./docs/element-settings-coverage-audit.md)
- [`docs/element-system-audit-phase-1.md`](./docs/element-system-audit-phase-1.md)
- [`docs/element-system-phase-2.md`](./docs/element-system-phase-2.md)
- [`docs/element-system-phase-3.md`](./docs/element-system-phase-3.md)
- [`docs/element-system-phase-4.md`](./docs/element-system-phase-4.md)
- [`docs/element-system-phase-5.md`](./docs/element-system-phase-5.md)
- [`docs/element-system-phase-5b.md`](./docs/element-system-phase-5b.md)
- [`docs/element-system-phase-5c.md`](./docs/element-system-phase-5c.md)
- [`docs/element-system-phase-5d.md`](./docs/element-system-phase-5d.md)
- [`docs/element-system-phase-5e.md`](./docs/element-system-phase-5e.md)
- [`docs/element-system-phase-5f.md`](./docs/element-system-phase-5f.md)
- [`docs/element-system-phase-5g.md`](./docs/element-system-phase-5g.md)
- [`docs/element-system-phase-6.md`](./docs/element-system-phase-6.md)
- [`docs/element-system-phase-7.md`](./docs/element-system-phase-7.md)
- [`docs/element-system-phase-8.md`](./docs/element-system-phase-8.md)
- [`docs/element-system-phase-9.md`](./docs/element-system-phase-9.md)
- [`docs/element-system-phase-10.md`](./docs/element-system-phase-10.md)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
```
