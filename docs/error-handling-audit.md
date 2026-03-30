# Error Handling Audit

Last reviewed: March 30, 2026

## Overview

Sitezy uses a centralized structured error system under:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/codes.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/messages.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/AppError.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/api.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/logger.ts`

Core usage pattern:

- server routes throw `createAppError(...)` and return `handleRouteError(...)`
- client code normalizes unknown failures with `normalizeError(...)`
- user-facing copy comes from `messages.ts`
- logging goes through `logAppError(...)`

## Active error domains

- `EDITOR_*`
- `STATE_*`
- `SAVE_*`
- `DB_*`
- `API_*`
- `VALIDATION_*`
- `UI_*`
- `AUTH_*`
- `NETWORK_*`
- `UNKNOWN_*`

## Current coverage

Structured handling is in place across the main application boundaries:

- project routes
- generation routes
- assist/regeneration routes
- export route
- media routes
- Supabase config helpers
- project persistence
- user media persistence
- dashboard generation flow
- auth screen
- editor top bar
- left/right sidebars
- preview intelligence path

Representative files:

- `/Users/hashem/Desktop/sitezyV2 copy/src/app/api/projects/route.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/app/api/projects/[id]/route.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/app/api/media/route.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/app/api/media/[id]/route.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/server/project-db.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/server/user-media.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/store/index.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/dashboard/CreateProjectModal.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/EditorTopBar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/LeftSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/marketing/AuthScreen.tsx`

## Registry summary

### Editor

- selection, hover, update, delete, duplicate, insert, move, render, panel, canvas

### State

- init, hydrate, sync, update, selection, page, history

### Save

- project save, autosave, serialize, deserialize

### Database

- read, write, update, delete, connection, schema

### API

- request, response, generate, save, timeout, rate limit, unknown, billing, auth

### Validation

- project, page, node, style, content, input

### UI

- render, action, modal, toast, boundary

### Auth

- required, session, permission, token

### Network / Unknown

- network failures and fallback unknown cases

## Why users see error codes

The UI may surface a human message plus the structured code so support/debugging can identify the exact failure path without exposing stack traces.

Examples:

- `API_TIMEOUT_001`
- `DB_SCHEMA_001`
- `AUTH_REQUIRED_001`

Safe human-facing copy still comes from:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/errors/messages.ts`

## Current weak spots

These are the notable remaining gaps in the current codebase.

### 1. Local media utility still throws a raw `Error`

File:

- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/MediaLibraryModal.tsx`

Current case:

- `createCanvas(...)` throws `new Error("Canvas 2D context unavailable")`

Impact:

- this is still caught by the upload flow and normalized at the action boundary
- it is not a user-facing crash path, but it bypasses first-class code creation locally

Recommended improvement:

- replace it with `createAppError({ code: UI_ACTION_001 ... })`

### 2. Browser-only media failures still rely on boundary normalization

Examples:

- image decoding failures
- browser canvas/blob generation failures
- transient optimization failures before a route boundary is involved

Impact:

- these are usually normalized by the nearest catch boundary
- the app is safe, but not every micro-failure has its own dedicated media-specific code

Recommended improvement:

- add a small media-upload error helper if upload complexity keeps growing

### 3. Audit docs can drift faster than code

The structured system is broad now, but these audit notes are hand-maintained.

Recommended improvement:

- keep this file updated during infra changes
- or add a lightweight check for obvious regressions like raw `ERR_*`, `alert(...)`, and unnormalized route catches

## Conclusion

The app is no longer using the old mixed legacy error approach. The primary error path is structured and consistent across the main application boundaries. The remaining issues are small local exceptions, not architecture-level gaps.
