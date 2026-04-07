# Development

## Local Setup

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Optional values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SITEZY_SPARK_KEY`
- `SITEZY_SPARK_MODEL`

### Configure Supabase

Use one of the SQL entry points:

- `supabase/reset-from-scratch.sql`
- `supabase/schema.sql`
- `supabase/add-user-media.sql`
- `supabase/add-user-settings.sql`
- `supabase/add-beta-access.sql`
- `supabase/add-beta-interest-requests.sql`
- `supabase/add-support-requests.sql`

In Supabase Auth:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- Enable Google and GitHub providers in Supabase Auth if you want OAuth login/signup.
- Add the provider credentials in Supabase Auth, not in `.env.local`.
- For invite-only beta mode, the auth screen now requires the invited email to be entered before redirecting to Google or GitHub so access can be prechecked locally.

### Run

```bash
npm run dev
```

## Verification

The repo does not currently expose a dedicated test suite through `package.json`. The main automated verification commands are:

```bash
npm run type-check
npm run build
```

Use both when the change touches routing, types, or cross-cutting product surfaces.

## Recommended Workflow

1. Make the code change.
2. Apply any required SQL changes.
3. Update documentation if the surface changed.
4. Run `npm run type-check`.
5. Run `npm run build` when the route graph, server code, or export flow changed.
6. Manually verify the affected UI in both dark and light mode for product-shell changes.

## How To Add A New API Feature

Use the existing project/settings/support/media pattern:

1. Define or extend the domain types in `src/types`.
2. Add a persistence helper in `src/lib/server`.
3. Add a route handler in `src/app/api`.
4. Validate inputs with the shared error helpers in `src/lib/errors`.
5. Add SQL migrations, indexes, and RLS policies.
6. Update `reset-from-scratch.sql`.
7. Update docs and `.env.example` if new configuration is required.

## How To Add A New Settings Feature

1. Extend `UserSettings` in `src/types`.
2. Update defaults and normalization in `src/lib/settings/index.ts`.
3. Extend persistence in `src/lib/server/user-settings.ts` if needed.
4. Add or update the section UI in `src/components/settings/sections`.
5. Make sure the feature applies cleanly through `applyUserSettingsToDocument(...)` if it affects global chrome.
6. Verify the feature survives refresh and re-login.

## How To Add A New Supabase-Backed Surface

Keep the ownership model consistent:

- every row should be owned by `user_id`
- every table should have RLS enabled
- every table should have policies for select, insert, update, and delete
- storage objects should also be user-scoped if binary files are involved

For upgrade safety:

- add an incremental SQL file if the change can be applied to an existing database
- update `reset-from-scratch.sql`
- update `schema.sql` when the change belongs in the canonical core schema

## Troubleshooting

### Light mode looks wrong

- Check `src/app/globals.css` for missing theme tokens.
- Look for hard-coded dark-only utility classes or RGBA values.
- Make sure the component is using shared surface and text variables.

### Settings do not persist

- Verify `GET /api/settings` and `PUT /api/settings` return authenticated responses.
- Check that `public.user_settings` exists in Supabase.
- Check browser storage for `sitezy-user-settings-cache`.

### Media uploads work inconsistently

- Verify `public.user_media` exists.
- Verify the `sitezy-media` storage bucket exists.
- Verify the storage policies from `add-user-media.sql` or `reset-from-scratch.sql` were applied.

### Support inbox does not work

- Verify `public.support_requests` exists.
- Verify `GET /api/support` and `POST /api/support` return authenticated responses.
- Verify the support request RLS policies were applied.

### Beta invite save fails with `DB_WRITE_001`

- Verify `public.beta_access` exists and `supabase/add-beta-access.sql` has been applied.
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set, because admin invite routes use the elevated Supabase client.
- Do not reintroduce `upsert(..., { onConflict: "email" })` unless the schema adds a matching unique constraint on `email`.
- The current schema enforces uniqueness through `lower(email)`, so invite writes should normalize the email, read first, then `insert` or `update`.

### Non-invited accounts should see the beta-interest page after signup/login

- Verify `public.beta_interest_requests` exists and `supabase/add-beta-interest-requests.sql` has been applied.
- Verify blocked users are not being signed out in the auth callback or `/app` entry flow.
- Verify `/beta/access-needed` loads while the user is authenticated.

### Account deletion fails

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set.
- Confirm the route is called with confirmation text `DELETE`.
