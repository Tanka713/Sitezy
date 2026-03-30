# Sitezy

Sitezy is an AI-powered multi-page website builder with a public marketing site, Supabase-backed auth and persistence, a visual editor, structured element editing, shared user media, and ZIP export.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Supabase Auth, Postgres, and Storage
- Anthropic API
- JSZip

## Current Product Surface

- Public landing page at `/`
- Login, signup, and reset-password flows at `/login`, `/signup`, and `/reset-password`
- Protected studio at `/studio`
- AI brief, blueprint, generation, section regeneration, and assist flows
- Visual editor with:
  - pages and layers
  - style inspector
  - responsive controls
  - code / split / preview modes
  - copy / paste / duplicate / cut
  - section move / duplicate / delete flows
- Shared user media gallery with:
  - upload
  - drag and drop
  - replace image/media flows
  - browser-side compression
  - thumbnails
  - Supabase Storage backing
- ZIP export

## Recent Additions

- Supabase Auth + protected studio flow
- Reset password flow with recovery screen
- User-scoped media library shared across projects
- Supabase Storage-backed uploads with thumbnails
- Full element-system cleanup and registry-based organization
- Structured settings for complex editor blocks
- Improved section management, duplication, and insertion flows
- Centralized error handling and error audit docs
- Supabase-backed project persistence with RLS

## Recent Fixes

- Hydration fixes across studio/auth render boundaries
- Undo/redo targeting the real editor iframe instead of a generic frame lookup
- Inspector stability fixes for stale state and wrong-target updates
- Canvas insertion and nesting reliability fixes
- Media replacement and nav/logo image stability fixes
- Shared toolbar/sidebar cleanup and editor surface consistency fixes

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Optional aliases supported by the AI service:

```env
SITEZY_SPARK_KEY=your-sitezy-spark-key
SITEZY_SPARK_MODEL=claude-sonnet-4-20250514
```

### 3. Configure Supabase

Choose the SQL path that matches your state:

- Fresh setup or full reset:
  - [supabase/reset-from-scratch.sql](/Users/hashem/Desktop/sitezyV2%20copy/supabase/reset-from-scratch.sql)
- Core schema only:
  - [supabase/schema.sql](/Users/hashem/Desktop/sitezyV2%20copy/supabase/schema.sql)
- Existing database that needs the shared media system:
  - [supabase/add-user-media.sql](/Users/hashem/Desktop/sitezyV2%20copy/supabase/add-user-media.sql)

Notes:

- `reset-from-scratch.sql` includes the core project tables, RLS, save RPC, `user_media`, and the `sitezy-media` storage bucket setup.
- `add-user-media.sql` is the upgrade path for the account-wide gallery and storage-backed uploads.

In Supabase Auth settings:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Enable any OAuth providers you want to use in Supabase Auth.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` marketing landing page
- `/login` sign in
- `/signup` sign up
- `/reset-password` recovery and password update
- `/studio` protected builder

## Main API Routes

- `/api/add-page`
- `/api/assist`
- `/api/blueprint`
- `/api/export`
- `/api/generate`
- `/api/insert-block`
- `/api/intelligence`
- `/api/map-resolve`
- `/api/media`
- `/api/media/[id]`
- `/api/preview-frame`
- `/api/projects`
- `/api/projects/[id]`
- `/api/regenerate-section`

## Persistence Notes

- Project persistence is server-backed through Supabase, not local SQLite.
- Project saves use the `public.save_project_snapshot(...)` RPC defined in the Supabase SQL files.
- Media is now user-level, not project-level.
- New uploads are stored in Supabase Storage and indexed in `public.user_media`.
- The editor still keeps one lightweight browser key for the last opened project:
  - `sitezy-last-project-id`

## Editor / System Docs

Detailed internal docs live in [docs](/Users/hashem/Desktop/sitezyV2%20copy/docs):

- [docs/element-system-audit-phase-1.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-audit-phase-1.md)
- [docs/element-settings-coverage-audit.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-settings-coverage-audit.md)
- [docs/media-gallery-system.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/media-gallery-system.md)
- [docs/error-handling-audit.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/error-handling-audit.md)

The element-system implementation notes are also split across:

- [docs/element-system-phase-2.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-2.md)
- [docs/element-system-phase-3.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-3.md)
- [docs/element-system-phase-4.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-4.md)
- [docs/element-system-phase-5.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5.md)
- [docs/element-system-phase-5b.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5b.md)
- [docs/element-system-phase-5c.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5c.md)
- [docs/element-system-phase-5d.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5d.md)
- [docs/element-system-phase-5e.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5e.md)
- [docs/element-system-phase-5f.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5f.md)
- [docs/element-system-phase-5g.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-5g.md)
- [docs/element-system-phase-6.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-6.md)
- [docs/element-system-phase-7.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-7.md)
- [docs/element-system-phase-8.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-8.md)
- [docs/element-system-phase-9.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-9.md)
- [docs/element-system-phase-10.md](/Users/hashem/Desktop/sitezyV2%20copy/docs/element-system-phase-10.md)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
```
