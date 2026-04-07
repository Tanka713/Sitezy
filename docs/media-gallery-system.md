# Media Gallery System

Last reviewed: March 30, 2026

## Overview

Sitezy now uses a shared user-level media library instead of storing gallery assets separately inside each project.

That means:

- each signed-in user has one media library
- all of that user's projects can reuse the same assets
- different users still have isolated libraries

## Main behavior

### Uploads

- image and video uploads go through the media library modal
- new uploads are stored in Supabase Storage
- image uploads are optimized in the browser before upload where safe
- thumbnails are generated automatically for supported raster images

### Reuse

- assets can be selected from the shared library in image/background/logo flows
- the same asset can be reused across multiple projects

### Management

- rename asset
- delete asset
- search media library
- drag and drop files into the gallery

## Architecture

### Client UI

- `/Users/hashem/Desktop/sitezyV2/src/components/editor/MediaLibraryModal.tsx`

This is the main media manager UI. It handles:

- browsing assets
- drag-and-drop upload
- upload button flow
- thumbnail display
- rename/delete actions
- multi-select where supported

### Shared state

- `/Users/hashem/Desktop/sitezyV2/src/lib/store/index.ts`

The store now keeps:

- `mediaLibrary`

Important behavior:

- loads account media through `/api/media`
- merges legacy project-scoped media into the shared library
- attempts background migration of missing legacy assets
- stops re-embedding gallery files into saved project payloads

### Media normalization

- `/Users/hashem/Desktop/sitezyV2/src/lib/media/library.ts`

This file defines normalization and shared constants, including:

- `USER_MEDIA_BUCKET = "sitezy-media"`

### Types

- `/Users/hashem/Desktop/sitezyV2/src/types/index.ts`

Key asset fields now include:

- `id`
- `name`
- `url`
- `thumbnailUrl`
- `kind`
- `storageBucket`
- `storagePath`
- `thumbnailStorageBucket`
- `thumbnailStoragePath`
- `mimeType`
- `size`
- `width`
- `height`

### API routes

- `/Users/hashem/Desktop/sitezyV2/src/app/api/media/route.ts`
- `/Users/hashem/Desktop/sitezyV2/src/app/api/media/[id]/route.ts`

Supported actions:

- `GET /api/media`
- `POST /api/media`
- `PATCH /api/media/[id]`
- `DELETE /api/media/[id]`

These routes are auth-protected and use the centralized error system.

### Server persistence

- `/Users/hashem/Desktop/sitezyV2/src/lib/server/user-media.ts`

This layer persists user media rows in Supabase and removes storage objects during delete.

## Storage model

### Database

User media records live in:

- `user_media`

SQL setup:

- `/Users/hashem/Desktop/sitezyV2/supabase/add-user-media.sql`
- `/Users/hashem/Desktop/sitezyV2/supabase/reset-from-scratch.sql`

### Storage bucket

Uploads are stored in:

- `sitezy-media`

Objects are namespaced under the authenticated user id.

## Image optimization

For safe raster types such as:

- `image/jpeg`
- `image/png`
- `image/webp`

the client upload flow:

- decodes the source image
- constrains large dimensions
- uploads a WebP main image
- uploads a smaller WebP thumbnail

For special cases like:

- `svg`
- `gif`
- video files

the original file path is kept instead of forcing raster conversion.

## Legacy compatibility

Older project-scoped gallery assets still work.

Current migration behavior:

- project media is read as legacy input
- missing items are merged into the shared user library
- store hydration tries to persist the missing legacy assets into `/api/media`
- future saves stop embedding the gallery back into project files

## Current limitations

- this is still a public-URL based media flow, not signed/private delivery
- there is no server-side image processing pipeline yet
- there is no account-wide folder/tag organization yet
- there is no bulk delete/reorder UI yet

## Recommended next improvements

- folder/tag organization
- asset usage tracking
- replace/overwrite asset flow
- optional signed/private delivery
- server-side image transforms if export/publish requirements grow
