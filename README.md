# Sitezy

Sitezy is an open-source, AI-assisted website builder for turning a structured brief into a polished, editable, multi-page website.

It combines an AI generation pipeline with a visual editor, persistent project storage, media management, preview and publishing flows, lead capture, CMS collections, analytics, support tooling, and ZIP export.

> Sitezy is no longer under active development. The repository is preserved as an open-source snapshot of the project and may receive occasional maintenance updates.

## What Sitezy includes

- AI-assisted brief and blueprint generation
- Streaming multi-page website generation
- Structured sections and reusable content blocks
- Visual editor with preview, split, and code-oriented workflows
- Section regeneration and block insertion
- Shared account-level media library backed by Supabase Storage
- Project pages, CMS collections, lead capture, and newsletter subscribers
- Preview, live-site rendering, publishing, and ZIP export
- Background project-generation jobs with an optional dedicated worker
- Persisted workspace and product settings
- Project analytics, comments, collaboration bootstrap, and webhooks
- Support inbox, beta access controls, and administrative tools

## Technology

- [Next.js 14](https://nextjs.org/) with the App Router
- React 18 and TypeScript
- Tailwind CSS
- Zustand for client-side state
- Supabase Auth, Postgres, Row Level Security, and Storage
- Anthropic Claude by default, with optional DeepSeek support
- CodeMirror for editable HTML, CSS, and JavaScript
- JSZip for project export
- Framer Motion and Lucide React for interaction and UI primitives

## Requirements

Before starting, install:

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- An Anthropic API key, unless you configure another supported AI provider

Node and npm versions can be checked with:

```bash
node --version
npm --version
```

## Installation

Clone the repository and install its dependencies:

```bash
git clone https://github.com/Tanka713/Sitezy-V2.git
cd Sitezy-V2
npm install
```

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure the required values.

## Environment variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the public Supabase browser key. Never put a Supabase service-role key or an AI provider key in a `NEXT_PUBLIC_*` variable.

### Recommended for the complete local experience

```env
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SITEZY_INTERNAL_BASE_URL=http://127.0.0.1:3000
```

The service-role key enables server-only administrative flows and lets the development process run background generation jobs. It must remain server-side and must never be committed or exposed to the browser.

### Optional AI provider settings

```env
SITEZY_AI_PROVIDER=anthropic

# Optional DeepSeek provider
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Optional Sitezy Spark aliases
SITEZY_SPARK_KEY=your-sitezy-spark-key
SITEZY_SPARK_MODEL=claude-sonnet-4-20250514
```

### Optional background-worker settings

```env
SITEZY_WORKER_SECRET=replace-with-a-long-random-secret
SITEZY_GENERATION_WORKER_ID=local-dev-worker
SITEZY_GENERATION_WORKER_POLL_MS=3000
SITEZY_GENERATION_WORKER_STEP_BACKOFF_MS=2000
SITEZY_GENERATION_WORKER_ERROR_BACKOFF_MS=5000
SITEZY_GENERATION_JOB_STALE_SECONDS=120
```

Use `SITEZY_WORKER_SECRET` when running the detached worker process. The worker calls the local application through `SITEZY_INTERNAL_BASE_URL` and uses the secret to authorize internal generation-step requests.

### Optional beta, support, and email settings

```env
SITEZY_BETA_MODE=invite-only
SITEZY_ADMIN_EMAILS=founder@example.com
SITEZY_BETA_ALLOWLIST=founder@example.com,designer@example.com
SITEZY_BETA_DENIED_MESSAGE=This private beta is currently limited to invited accounts.
SITEZY_SUPPORT_EMAIL=support@sitezy.app
RESEND_API_KEY=re_xxxxxxxxx
SITEZY_SUPPORT_FROM_EMAIL=support@updates.sitezy.app
```

These settings are only needed for invite-only access and support-reply email flows.

### Optional image providers

```env
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
PEXELS_API_KEY=your-pexels-api-key
```

Without these keys, Sitezy uses a keyless keyword-matched fallback for generated imagery. Unsplash or Pexels keys generally provide more relevant business imagery.

### Optional generation controls

```env
SITEZY_GENERATION_MODE=efficient
SITEZY_STREAM_MAX_TOKENS=9000
SITEZY_JSON_MAX_TOKENS=3000
```

## Supabase setup

1. Create a new Supabase project.
2. Open the Supabase SQL Editor.
3. For a new database, run [`supabase/reset-from-scratch.sql`](./supabase/reset-from-scratch.sql).
4. For an existing Sitezy database, apply only the migrations required for the features you need.
5. Confirm that the `sitezy-media` Storage bucket and its policies exist after applying the schema.

The reset script is the easiest path for a fresh local installation. It creates the core tables, project-save RPC, indexes, Row Level Security policies, storage configuration, generation jobs, publishing records, CMS tables, lead-capture tables, support tables, and AI-learning tables.

### Incremental migrations

The repository also contains focused migrations for existing databases:

- `add-project-generation-jobs.sql`
- `add-project-publishing.sql`
- `add-project-cms.sql`
- `add-project-lead-capture.sql`
- `add-project-seo.sql`
- `add-user-media.sql`
- `add-user-settings.sql`
- `add-beta-access.sql`
- `add-beta-interest-requests.sql`
- `add-support-requests.sql`
- `add-support-request-replies.sql`
- `add-support-ticket-numbers.sql`
- `add-ai-learning.sql`
- `extend-ai-learning-feedback.sql`
- `tune-ai-learning-guardrails.sql`
- `add-platform-expansion.sql`

When adding a new database-backed feature, update both the relevant incremental migration and the canonical reset/schema files.

### Supabase Auth configuration

For local development, configure these values in Supabase Authentication → URL Configuration:

```text
Site URL:     http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

To enable OAuth login:

1. Enable Google and/or GitHub under Supabase Authentication → Providers.
2. Add the provider client ID and secret in Supabase.
3. Configure the provider callback URL using the callback URL Supabase provides for your project.
4. Test both sign-in and sign-up flows from Sitezy.

## Running Sitezy locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The `dev` script starts Next.js through `scripts/dev-with-worker.mjs`. If `SUPABASE_SERVICE_ROLE_KEY` is present, it also starts the project-generation worker automatically. If that key is absent, the web app still starts, but background generation will not be launched by the combined development script.

### Run the app without the worker

```bash
npm run dev:app
```

### Run the worker separately

In a second terminal, with the app already running:

```bash
npm run worker:project-generation
```

This is useful when you want to inspect or restart the worker independently from the Next.js process.

### Production-like local run

```bash
npm run build
npm run start
```

## Useful commands

```bash
npm run dev                    # Next.js plus worker when configured
npm run dev:app                # Next.js only
npm run worker:project-generation
npm run type-check             # TypeScript verification
npm run lint                   # Next.js linting
npm run build                  # Production build
npm run start                  # Run the production build
```

The project does not currently expose a dedicated automated test suite through `package.json`. For meaningful changes, run at least:

```bash
npm run type-check
npm run build
```

## Product routes

### Public routes

- `/` — marketing site
- `/login` — sign in
- `/signup` — account creation
- `/reset-password` — password reset
- `/privacy` — privacy policy
- `/terms` — terms of use
- `/support` — public support entry point

### Authenticated routes

- `/app` — project dashboard
- `/studio` — project studio
- `/studio/cms/[projectId]` — CMS collections and entries
- `/studio/leads/[projectId]` — project leads
- `/settings` — account and workspace settings
- `/preview/[projectId]` — project preview
- `/admin` — administrative tools
- `/customer-service` — support operations
- `/beta/access-needed` — access-request state for invite-only mode

## API overview

The main API areas are:

- AI generation: `/api/brief-chat`, `/api/blueprint`, `/api/generate`, `/api/assist`, `/api/intelligence`, `/api/add-page`, `/api/regenerate-section`, `/api/insert-block`
- Projects and pages: `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/pages`, `/api/projects/[id]/generation`
- Preview and publishing: `/api/preview-frame`, `/api/projects/[id]/preview/share`, `/api/projects/[id]/publish`, `/api/projects/[id]/deployments`
- Media and export: `/api/media`, `/api/export`, `/api/map-resolve`
- CMS and leads: `/api/projects/[id]/cms`, `/api/projects/[id]/leads`, `/api/projects/[id]/lead-capture`, `/api/projects/[id]/subscribers`
- Analytics and collaboration: `/api/projects/[id]/analytics`, `/api/projects/[id]/collab`, `/api/projects/[id]/comments`, `/api/projects/[id]/webhooks`
- Settings and support: `/api/settings`, `/api/support`, `/api/customer-service/support`, `/api/admin/invites`
- AI learning and training: `/api/ai-learning`, `/api/admin/training-data`

## Architecture at a glance

```text
Browser
  ↓
Next.js App Router and API routes
  ├─ Supabase Auth and user-scoped data
  ├─ Supabase Storage for media
  ├─ AI provider adapters and generation engines
  ├─ Project/page/section persistence
  └─ Preview, publishing, export, CMS, leads, and analytics
          ↓
  Background generation jobs
          ↓
  In-process or detached project-generation worker
```

Important implementation areas:

- `src/app` — application routes and API handlers
- `src/components` — product UI and editor surfaces
- `src/lib/ai` — provider adapters, prompts, engines, validation, and generation orchestration
- `src/lib/server` — server-only persistence and domain services
- `src/lib/blocks` — block registry and block factory
- `src/types` — shared domain types
- `supabase` — schema and migrations
- `docs` — architecture, data, frontend, and development notes

For a deeper tour, start with [`docs/index.md`](./docs/index.md), then read [`docs/architecture.md`](./docs/architecture.md) and [`docs/backend-and-data.md`](./docs/backend-and-data.md).

## Data and security model

- Projects, pages, files, settings, media metadata, leads, CMS data, and support records are persisted in Supabase.
- User-owned tables use `user_id` ownership and Row Level Security policies.
- Project saves use the `public.save_project_snapshot(...)` database function.
- Binary media is stored in the `sitezy-media` bucket; metadata is stored in `public.user_media`.
- Service-role access is used only by server-side administrative and worker flows.
- Never commit `.env.local`, API keys, service-role keys, OAuth secrets, or generated private credentials.

Before deploying publicly, review the RLS policies, OAuth redirect configuration, rate limits, AI-provider spending limits, and service-role usage for your environment.

## Troubleshooting

### The app starts but generation does not run

Set `SUPABASE_SERVICE_ROLE_KEY`, make sure `supabase/reset-from-scratch.sql` or `add-project-generation-jobs.sql` has been applied, and restart `npm run dev`. If using a detached worker, also set `SITEZY_WORKER_SECRET` and `SITEZY_INTERNAL_BASE_URL`.

### Supabase authentication redirects incorrectly

Check that the Supabase Site URL and redirect URL exactly match `http://localhost:3000` and `http://localhost:3000/auth/callback` for local development.

### Media upload fails

Verify that `public.user_media` exists, the `sitezy-media` bucket exists, and the storage policies from `add-user-media.sql` or `reset-from-scratch.sql` were applied.

### Settings do not persist

Verify that `public.user_settings` exists and that the authenticated user can reach `GET /api/settings` and `PUT /api/settings`.

### Admin or customer-service pages are unavailable

Those flows require `SUPABASE_SERVICE_ROLE_KEY` and the corresponding beta/access/support migrations. Confirm that the signed-in account has the expected internal role or allowlist entry.

## Contributing

Contributions are welcome. Before opening a pull request:

1. Explain the user-facing problem or capability.
2. Keep changes scoped and follow the existing domain boundaries.
3. Add or update Supabase migrations for schema changes.
4. Update `reset-from-scratch.sql` when adding a new persisted feature.
5. Update documentation when routes, configuration, or behavior changes.
6. Run `npm run type-check`, `npm run lint`, and `npm run build` when applicable.
7. Do not include secrets, local credentials, generated build output, or `.claude/worktrees` state.

## Project context

Sitezy began as a personal product-building project and is now preserved as an open-source project snapshot. For the longer personal background and development history, see [`README-PERSONAL.md`](./README-PERSONAL.md).

## License

No open-source license has been selected in this repository yet. Until a `LICENSE` file is added, the source remains under the copyright of its author and should not be assumed to be available for unrestricted redistribution.
