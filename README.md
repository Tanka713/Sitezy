# Sitezy

Sitezy is an AI website builder with a public marketing site, Supabase-backed auth and project persistence, an interactive visual editor, AI generation flows, and ZIP export.

## Current stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Supabase Auth + Postgres
- Anthropic API
- JSZip

## What the app includes

- Public landing page at `/`
- Login and signup flows at `/login` and `/signup`
- Protected builder at `/studio`
- AI blueprint generation and page generation
- Visual editor with canvas, layers, style inspector, responsive controls, and AI-assisted actions
- Project save/load through Supabase
- ZIP export of generated sites

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

Run the SQL schema in Supabase:

- [supabase/schema.sql](/Users/hashem/Desktop/sitezyV2%20copy/supabase/schema.sql)

If you want a clean reset instead, use:

- [supabase/reset-from-scratch.sql](/Users/hashem/Desktop/sitezyV2%20copy/supabase/reset-from-scratch.sql)

In Supabase Auth settings:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Enable any OAuth providers you want to use in Supabase Auth.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App routes

- `/` marketing landing page
- `/login` sign in
- `/signup` sign up
- `/studio` protected builder

## Main API routes

- `/api/blueprint`
- `/api/generate`
- `/api/assist`
- `/api/projects`
- `/api/projects/[id]`
- `/api/regenerate-section`
- `/api/export`

## Important notes

- Project persistence is server-backed through Supabase, not local SQLite.
- The save path now depends on the `public.save_project_snapshot(...)` SQL function defined in the Supabase SQL files.
- The editor keeps one lightweight browser key only for the last opened project:
  - `sitezy-last-project-id`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run type-check
```
