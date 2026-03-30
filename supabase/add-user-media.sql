create table if not exists public.user_media (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  thumbnail_url text null,
  kind text not null,
  storage_bucket text null,
  storage_path text null,
  thumbnail_storage_bucket text null,
  thumbnail_storage_path text null,
  mime_type text null,
  size bigint null,
  width integer null,
  height integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_media add column if not exists thumbnail_url text null;
alter table public.user_media add column if not exists storage_bucket text null;
alter table public.user_media add column if not exists storage_path text null;
alter table public.user_media add column if not exists thumbnail_storage_bucket text null;
alter table public.user_media add column if not exists thumbnail_storage_path text null;

create index if not exists idx_user_media_user_id on public.user_media(user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('sitezy-media', 'sitezy-media', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

alter table public.user_media enable row level security;

drop policy if exists "user_media_select_own" on public.user_media;
create policy "user_media_select_own" on public.user_media
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_media_insert_own" on public.user_media;
create policy "user_media_insert_own" on public.user_media
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_media_update_own" on public.user_media;
create policy "user_media_update_own" on public.user_media
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_media_delete_own" on public.user_media;
create policy "user_media_delete_own" on public.user_media
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "sitezy_media_insert_own" on storage.objects;
create policy "sitezy_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sitezy-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sitezy_media_update_own" on storage.objects;
create policy "sitezy_media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sitezy-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'sitezy-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sitezy_media_delete_own" on storage.objects;
create policy "sitezy_media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sitezy-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
