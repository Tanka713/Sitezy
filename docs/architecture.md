# Architecture

## High-Level Shape

Sitezy has three main surfaces:

- Public marketing and auth pages served from the App Router.
- An authenticated studio for dashboard, project editing, settings, and preview.
- Internal admin and customer-service dashboards for beta access and support operations.
- A blocked-account beta-interest surface for users who can authenticate but are not invited yet.
- A server layer that talks to Anthropic and Supabase for generation, persistence, settings, media, and support flows.

At a high level, the product loop is:

1. A user signs in through Supabase Auth.
2. The dashboard or editor loads persisted data through API routes under `src/app/api`.
3. Server helpers under `src/lib/server` read and write Supabase-backed state.
4. Client state is hydrated into the Zustand store in `src/lib/store/index.ts`.
5. The editor and settings surfaces update both the local UI and the server-backed snapshot.

## Directory Map

### `src/app`

- App Router pages and route handlers.
- Public pages live at `/`, `/login`, `/signup`, and `/reset-password`.
- Protected product routes live at `/studio`, `/settings`, and `/preview/[projectId]`.
- Internal role routes also include `/admin` and `/customer-service`.
- API routes under `src/app/api` expose the generation, persistence, settings, media, support, beta access, preview, and export surfaces.

### `src/components`

- `marketing/`: landing and auth screens.
- `dashboard/`: project listing, creation, and entry point into the editor.
- `editor/`: main builder shell, sidebars, code pane, preview, and media modal.
- `settings/`: full settings application, section registry, and settings primitives.
- `ui/`: shared shell components such as the avatar menu and error toast.

### `src/lib`

- `ai/`: Anthropic-facing generation and assist logic.
- `server/`: Supabase-backed data access for projects, media, settings, and support.
- `settings/`: defaults, normalization, cache, broadcast, and document theme application.
- `store/`: shared client state through Zustand.
- `errors/`: app-level error codes, normalization, API helpers, and logging.
- `editor/`, `blocks/`, `media/`, and `utils/`: editor-specific parsing, block registry logic, media helpers, and HTML/build utilities.

### `supabase`

- Canonical SQL and upgrade scripts.
- `reset-from-scratch.sql` is the full rebuild path.
- `schema.sql` is the core schema baseline.
- Incremental upgrade scripts exist for media, settings, and support requests.

## App Bootstrap

The root layout in `src/app/layout.tsx` mounts two cross-app concerns:

- `SettingsBootstrap`, which reads cached settings, fetches `/api/settings`, and applies workspace preferences to the document root.
- `ErrorToast`, which renders normalized client-facing API and runtime errors.

This means theme, density, motion, and font preference can affect the entire app before a specific page component finishes rendering.

## State Model

There are two kinds of state in the product:

- Durable server state in Supabase.
- Short-lived client state in the Zustand store and browser storage.

Server-backed state includes:

- project snapshots
- user settings
- shared media metadata
- beta access and internal roles
- blocked-account beta interest records
- support requests

Browser-local state includes:

- the last opened project id
- cached user settings for early document paint
- active editor and selection state while the user is working

## Request Flow

### Generation flow

1. The client sends a brief, page, section, or block request to an AI route.
2. The route validates input through `src/lib/errors`.
3. `src/lib/ai/service.ts` talks to Anthropic.
4. The server returns JSON or SSE back to the client.

### Persistence flow

1. The dashboard or editor calls a route under `/api/projects`, `/api/media`, `/api/settings`, or `/api/support`.
2. The route authenticates through `getAuthenticatedUser()`.
3. A server helper in `src/lib/server` talks to Supabase with RLS-aware credentials.
4. Normalized data comes back to the client and is written into local state.

### Preview/export flow

- `/api/preview-frame` returns HTML for the iframe preview used inside the editor.
- `/preview/[projectId]` renders a share-like internal preview route with client-side page navigation rewriting.
- `/api/export` packages the current project into a ZIP file.

## Settings Architecture

The settings system is a first-class product area, not just local UI state:

- `src/components/settings/SettingsPage.tsx` is the main orchestrator.
- Each section lives in `src/components/settings/sections`.
- `src/lib/settings/index.ts` owns defaults, normalization, document mutation, cache, and broadcast.
- `src/lib/server/user-settings.ts` persists settings to Supabase.

The support section also now uses the same backend pattern, with requests stored in `public.support_requests` and exposed through `/api/support`.

## Error Handling

The app uses a centralized error system instead of ad hoc thrown strings:

- input parsing helpers live in `src/lib/errors/api.ts`
- app error construction is centralized in `src/lib/errors/AppError.ts`
- route handlers use `handleRouteError(...)`
- UI and server logging go through the shared error helpers

That pattern should be preserved for any new route or server helper.
