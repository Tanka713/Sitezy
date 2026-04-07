create table if not exists public.cms_collections (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  preset text not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_collections_preset_check check (preset in ('custom', 'blog_posts', 'case_studies', 'team_members', 'faq_items'))
);

create table if not exists public.cms_fields (
  id uuid primary key,
  collection_id uuid not null references public.cms_collections(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null default 'text',
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_fields_field_type_check check (field_type in ('text', 'textarea', 'rich_text', 'image', 'url', 'date'))
);

create table if not exists public.cms_entries (
  id uuid primary key,
  collection_id uuid not null references public.cms_collections(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null,
  status text not null default 'draft',
  values_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_entries_status_check check (status in ('draft', 'published'))
);

create unique index if not exists idx_cms_collections_project_slug_lower on public.cms_collections(project_id, lower(slug));
create index if not exists idx_cms_collections_project_id on public.cms_collections(project_id, created_at desc);
create unique index if not exists idx_cms_fields_collection_key_lower on public.cms_fields(collection_id, lower(key));
create index if not exists idx_cms_fields_collection_id on public.cms_fields(collection_id, sort_order);
create unique index if not exists idx_cms_entries_collection_slug_lower on public.cms_entries(collection_id, lower(slug));
create index if not exists idx_cms_entries_collection_id on public.cms_entries(collection_id, sort_order, created_at asc);

alter table public.cms_collections enable row level security;
alter table public.cms_fields enable row level security;
alter table public.cms_entries enable row level security;

drop policy if exists "cms_collections_select_own" on public.cms_collections;
drop policy if exists "cms_collections_insert_own" on public.cms_collections;
drop policy if exists "cms_collections_update_own" on public.cms_collections;
drop policy if exists "cms_collections_delete_own" on public.cms_collections;
drop policy if exists "cms_fields_select_own" on public.cms_fields;
drop policy if exists "cms_fields_insert_own" on public.cms_fields;
drop policy if exists "cms_fields_update_own" on public.cms_fields;
drop policy if exists "cms_fields_delete_own" on public.cms_fields;
drop policy if exists "cms_entries_select_own" on public.cms_entries;
drop policy if exists "cms_entries_insert_own" on public.cms_entries;
drop policy if exists "cms_entries_update_own" on public.cms_entries;
drop policy if exists "cms_entries_delete_own" on public.cms_entries;

create policy "cms_collections_select_own" on public.cms_collections
  for select to authenticated
  using (user_id = auth.uid());

create policy "cms_collections_insert_own" on public.cms_collections
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "cms_collections_update_own" on public.cms_collections
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cms_collections_delete_own" on public.cms_collections
  for delete to authenticated
  using (user_id = auth.uid());

create policy "cms_fields_select_own" on public.cms_fields
  for select to authenticated
  using (user_id = auth.uid());

create policy "cms_fields_insert_own" on public.cms_fields
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "cms_fields_update_own" on public.cms_fields
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cms_fields_delete_own" on public.cms_fields
  for delete to authenticated
  using (user_id = auth.uid());

create policy "cms_entries_select_own" on public.cms_entries
  for select to authenticated
  using (user_id = auth.uid());

create policy "cms_entries_insert_own" on public.cms_entries
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "cms_entries_update_own" on public.cms_entries
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cms_entries_delete_own" on public.cms_entries
  for delete to authenticated
  using (user_id = auth.uid());
