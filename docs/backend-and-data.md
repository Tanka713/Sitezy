# Backend And Data

## Overview

The backend surface is implemented inside the Next.js app:

- Route handlers live under `src/app/api`.
- Supabase access helpers live under `src/lib/supabase`.
- Product-specific persistence helpers live under `src/lib/server`.
- SQL lives under `supabase`.

The app relies on Supabase for auth, relational storage, row-level security, and media storage. Anthropic powers the generation endpoints.

## Environment

Required for normal app operation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Optional:

- `SUPABASE_SERVICE_ROLE_KEY`
  - needed for internal admin/customer-service flows such as beta invite management, support queue access, and `DELETE /api/settings/account`
- `SITEZY_SPARK_KEY`
- `SITEZY_SPARK_MODEL`

## Auth And Supabase Clients

### Browser and SSR auth

- `src/lib/supabase/browser.ts` creates the client-side Supabase client.
- `src/lib/supabase/server.ts` creates the SSR/server route client and exposes `getAuthenticatedUser()`.

The server client uses the request cookie jar, so authenticated API routes work through normal Supabase session cookies.

### Admin client

- `src/lib/supabase/admin.ts` creates an elevated client using `SUPABASE_SERVICE_ROLE_KEY`.

This is intentionally limited. Do not use the admin client for normal CRUD that should be governed by RLS.

## API Routes

### AI routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/blueprint` | `POST` | Builds a site blueprint from a user brief. |
| `/api/generate` | `POST` | Streams full page generation over SSE. |
| `/api/add-page` | `POST` | Generates a new page from an existing blueprint and brief. |
| `/api/regenerate-section` | `POST` | Rewrites a single section using the current page and section context. |
| `/api/insert-block` | `POST` | Generates a new block for a given placement inside a page. |
| `/api/assist` | `POST` | Streams assistant guidance and editing help over SSE. |
| `/api/intelligence` | `POST` | Returns structured improvement suggestions for a section. |
| `/api/map-resolve` | `POST` | Normalizes share links into embeddable Google Maps URLs. |

Notes:

- Generation routes are long-running Node runtimes with explicit `maxDuration` values.
- They validate payloads through the shared error helpers before calling `src/lib/ai/service.ts`.

### Persistence routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/projects` | `GET` | Lists the current user's projects. |
| `/api/projects` | `POST` | Creates a draft project from a brief or provided project payload. |
| `/api/projects/[id]` | `GET` | Loads a full project snapshot. |
| `/api/projects/[id]` | `PUT` | Saves a project snapshot, editor state, and AI chats. |
| `/api/projects/[id]` | `DELETE` | Deletes a project owned by the current user. |
| `/api/media` | `GET` | Lists account-wide media assets. |
| `/api/media` | `POST` | Upserts media records after uploads or synchronization. |
| `/api/media/[id]` | `PATCH` | Renames a media asset. |
| `/api/media/[id]` | `DELETE` | Deletes a media asset and its backing storage objects. |
| `/api/settings` | `GET` | Returns the account profile plus normalized user settings. |
| `/api/settings` | `PUT` | Merges and persists a partial settings patch. |
| `/api/settings` | `DELETE` | Resets persisted settings to app defaults. |
| `/api/settings/account` | `DELETE` | Permanently deletes the authenticated user after confirmation. |
| `/api/support` | `GET` | Lists the current user's support requests. |
| `/api/support` | `POST` | Creates a bug report, feature request, or support request. |
| `/api/admin/invites` | `GET` | Lists beta access members and invite summary for admins. |
| `/api/admin/invites` | `POST` | Creates or refreshes a beta access record and can dispatch an invite email. |
| `/api/admin/invites/[id]` | `PATCH` | Updates an existing beta access record's role or status. |
| `/api/beta/interest` | `GET` | Returns or creates the current blocked account's beta-interest record. |
| `/api/beta/interest` | `PUT` | Updates the blocked account's beta-interest note. |
| `/api/customer-service/support` | `GET` | Lists support requests for the internal customer-service queue. |
| `/api/customer-service/support/[id]` | `PATCH` | Updates support request status from customer service. |
| `/api/customer-service/support/[id]` | `POST` | Creates a staff reply and optionally sends an email. |

### Preview and export routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/preview-frame` | `GET` | Returns rendered HTML for the editor iframe preview. |
| `/preview/[projectId]` | `GET` | Renders an internal preview route with rewritten page navigation. |
| `/api/export` | `POST` | Exports the current project as a ZIP package. |

## Server Helpers

### `src/lib/server/project-db.ts`

Owns project persistence:

- project listing
- draft creation
- full snapshot loading
- snapshot saving
- deletion

Important details:

- Projects are normalized before persistence.
- Media references are extracted into a virtual media library file for project snapshots.
- Saves prefer the `public.save_project_snapshot(...)` RPC when available, with a legacy fallback path.

### `src/lib/server/user-media.ts`

Owns shared media persistence and storage coordination:

- listing
- upserting metadata rows
- rename
- delete

The product treats media as user-scoped, not project-scoped.

### `src/lib/server/user-settings.ts`

Owns settings persistence:

- read current settings
- return account + settings payload
- upsert a partial settings patch
- reset settings to defaults
- update billing snapshot fields

### `src/lib/server/beta-access.ts`

Owns private-beta and internal-role persistence:

- resolve current access from auth email and stored access row
- list beta access members for admins
- create or refresh beta invites
- update role/status for an existing member
- support bootstrap admin access through environment configuration

Important detail:

- `public.beta_access` enforces uniqueness through `lower(email)`, not a raw unique constraint on `email`.
- Because of that, invite writes should normalize the email, resolve any existing row first, then perform an explicit `insert` or `update`.
- Do not use `upsert(..., { onConflict: "email" })` unless the schema is changed to support that conflict target directly.

### `src/lib/server/beta-interest.ts`

Owns blocked-account interest capture:

- creates a beta-interest record the first time a blocked authenticated account lands on the gate page
- reads the current account's beta-interest record
- updates the optional note the user leaves for the beta team

### `src/lib/server/support-requests.ts`

Owns the settings support inbox:

- list requests for the authenticated user
- create new support requests
- normalize kind, status, and metadata

The support UI sends `kind`, `subject`, `message`, and lightweight request metadata such as the current route and browser user agent.

## Database Inventory

### Core project tables

- `public.projects`
- `public.pages`
- `public.files`

These three tables store the project shell, per-page HTML/metadata, and virtual files.

### User settings

- `public.user_settings`

Stores a normalized JSON blob for workspace, AI, export, integration, billing, experimental, security, and creative-mode preferences.

### Support requests

- `public.support_requests`
- `public.support_request_replies`

Stores:

- ticket number
- request type
- subject
- message
- pending/open/closed status
- metadata JSON
- created and updated timestamps
- reply thread rows with responder role, responder name, delivery state, and timestamps

### Private beta and internal roles

- `public.beta_access`
- `public.beta_interest_requests`

Stores:

- normalized email-based access rows
- platform role: `customer`, `customer_service`, or `admin`
- invite status: `invited`, `active`, or `revoked`
- inviter id, linked auth user id, and acceptance timestamp
- blocked-account interest rows with email, optional note, and source of capture

### Shared media

- `public.user_media`
- `storage.buckets` entry for `sitezy-media`
- `storage.objects` policies scoped to each user

Binary files live in Supabase Storage. Metadata lives in Postgres.

## RLS Model

All user-owned tables are protected with row-level security. The pattern is consistent:

- `select` only where `user_id = auth.uid()`
- `insert` only with `user_id = auth.uid()`
- `update` only for rows owned by `auth.uid()`
- `delete` only for rows owned by `auth.uid()`

Storage policies follow the same ownership model for the `sitezy-media` bucket.

## Migration Strategy

Use the SQL files as follows:

- `reset-from-scratch.sql`
  - full rebuild for local/dev or destructive resets
- `schema.sql`
  - core schema baseline for projects, settings, support, and the save RPC
- `add-user-media.sql`
  - incremental upgrade for shared media and storage policies
- `add-user-settings.sql`
  - incremental upgrade for persisted settings on an older database
- `add-beta-access.sql`
  - incremental upgrade for invite-only beta access and internal roles
- `add-beta-interest-requests.sql`
  - incremental upgrade for blocked-account beta interest capture
- `add-support-requests.sql`
  - incremental upgrade for the support inbox
- `add-support-request-replies.sql`
  - incremental upgrade for support reply threads
- `add-support-ticket-numbers.sql`
  - incremental upgrade for support ticket numbering
- `add-support-reply-author-names.sql`
  - incremental upgrade for persisted responder names on support replies

If you add a new backend feature, update both:

- the relevant incremental migration
- `reset-from-scratch.sql`

If the feature belongs in the canonical core schema, also update `schema.sql`.

## Implementation Pattern For New Backend Features

When adding a new server-backed product feature, follow this shape:

1. Add types in `src/types`.
2. Add server persistence helpers in `src/lib/server`.
3. Add or extend the API route under `src/app/api`.
4. Add SQL for tables, policies, indexes, and storage if needed.
5. Update `reset-from-scratch.sql` and any canonical schema files.
6. Keep validation and route failure handling inside the shared error system.
