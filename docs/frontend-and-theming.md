# Frontend And Theming

## Frontend Surface

### Public routes

- `/`
  - marketing landing page
- `/login`
  - sign-in screen
- `/signup`
  - sign-up screen
- `/reset-password`
  - password recovery and reset flow

### Protected routes

- `/studio`
  - dashboard plus editor shell
- `/settings`
  - full account and product settings application
- `/preview/[projectId]`
  - internal rendered preview of persisted project pages

## Main UI Modules

### Marketing

- `src/components/marketing/LandingPage.tsx`
- `src/components/marketing/AuthScreen.tsx`
- `src/components/marketing/ResetPasswordScreen.tsx`

### Dashboard

- `src/components/dashboard/Dashboard.tsx`
- `src/components/dashboard/ProjectCard.tsx`
- `src/components/dashboard/CreateProjectModal.tsx`
- `src/components/dashboard/GeneratingScreen.tsx`

### Editor

- `src/components/editor/Editor.tsx`
- `src/components/editor/EditorTopBar.tsx`
- `src/components/editor/LeftSidebar.tsx`
- `src/components/editor/RightSidebar.tsx`
- `src/components/editor/PreviewCanvas.tsx`
- `src/components/editor/CodeEditorPane.tsx`
- `src/components/editor/MediaLibraryModal.tsx`

### Settings

- `src/components/settings/SettingsPage.tsx`
- `src/components/settings/SettingsSidebarNav.tsx`
- `src/components/settings/SettingsContentPanel.tsx`
- `src/components/settings/ui.tsx`
- `src/components/settings/sections/*`

### Shared shell

- `src/components/AppShell.tsx`
- `src/components/ui/UserAvatarMenu.tsx`
- `src/components/ui/ErrorToast.tsx`

## State Model

The frontend uses a mix of:

- server-rendered data for route entry
- client fetches for updates
- Zustand for shared interactive product state
- browser storage for small UX optimizations

### Zustand

`src/lib/store/index.ts` is the core shared client store. It owns:

- hydrated projects
- active editor state
- API error state
- project/session context

### Browser storage

The app uses lightweight browser storage for:

- `sitezy-last-project-id`
  - restore the last opened project
- `sitezy-user-settings-cache`
  - apply theme and workspace preferences before the server round-trip finishes

## Theme System

The theme system is centralized in `src/app/globals.css`.

The important design rule is:

- use theme tokens and shared surfaces
- do not hard-code dark-only colors for app chrome

### Document-level switches

`src/lib/settings/index.ts` applies these attributes to `document.documentElement`:

- `data-theme="dark" | "light"`
- `data-motion="default" | "reduced"`
- `data-density="comfortable" | "compact"`
- `data-font-preference="default" | "system" | "geometric"`

It also sets:

- `--sz-ui-scale`

### Core token families

The CSS variables in `src/app/globals.css` are grouped around:

- background tokens
- surface tokens
- border tokens
- text tokens
- accent tokens
- state colors
- shadow tokens

Important examples:

- `--surface-1` through `--surface-5`
- `--surface-shell`
- `--surface-topbar`
- `--text-primary`
- `--text-secondary`
- `--border-soft`
- `--accent-default`

The light theme overrides these variables in `html[data-theme="light"]`.

## Settings Bootstrap

`src/components/settings/SettingsBootstrap.tsx` is responsible for global settings hydration:

1. Read cached settings from local storage.
2. Apply them immediately to the document.
3. Fetch `/api/settings`.
4. Normalize and cache the latest settings.
5. Re-apply them to the document.
6. React to cross-app `sitezy-settings-updated` events.
7. Re-evaluate system theme changes when the workspace theme is set to `system`.

This component is mounted in the root layout, so the whole product shares the same document-level settings behavior.

## Light Mode Rules

Light mode bugs in this codebase usually come from three mistakes:

1. hard-coded dark gradients
2. `text-white`, `bg-black`, or `white/...` overlays inside app chrome
3. component-specific borders and shadows that ignore the global token set

When editing UI, prefer:

- `var(--text-primary)` over fixed white text
- `var(--surface-*)` over raw translucent black/white backgrounds
- `var(--border-soft)` or `var(--border-default)` over ad hoc RGBA borders
- `var(--shadow-*)` over custom dark-only shadows

Avoid introducing new dark-only utility classes on product shell surfaces unless the component is intentionally theme-invariant.

## Settings Surface

The settings application is split into section components so each feature area can persist independently:

- account
- workspace
- AI settings
- creative mode
- project defaults
- export and deployment
- integrations
- billing
- experimental
- security
- support and feedback

The support section is now backend-backed and no longer just a mailto-style placeholder.

## Preview Surface

There are two preview paths:

- `/api/preview-frame`
  - iframe HTML for the editor
- `/preview/[projectId]`
  - standalone route for internal project preview

The standalone preview injects a small script that rewrites internal navigation so links between generated pages continue to work inside the preview route.

## Contributor Rules For UI Work

Before shipping a UI change:

1. Check both dark and light themes.
2. Check the settings-selected font preference if typography changed.
3. Check reduced motion if you added animation.
4. Check desktop and mobile breakpoints.
5. Prefer existing settings UI primitives or shared shell primitives over one-off components.
