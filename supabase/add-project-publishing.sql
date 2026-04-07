create table if not exists public.published_sites (
  id uuid primary key,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subdomain text not null,
  status text not null default 'unpublished',
  active_deployment_id uuid null,
  last_published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_sites_status_check check (status in ('unpublished', 'publishing', 'published', 'failed'))
);

create table if not exists public.project_deployments (
  id uuid primary key,
  published_site_id uuid not null references public.published_sites(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  status text not null default 'published',
  published_url text not null,
  page_count integer not null default 0,
  project_json jsonb not null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_deployments_status_check check (status in ('publishing', 'published', 'failed'))
);

alter table public.published_sites drop constraint if exists published_sites_active_deployment_id_fkey;
alter table public.published_sites
  add constraint published_sites_active_deployment_id_fkey
  foreign key (active_deployment_id) references public.project_deployments(id) on delete set null;

create table if not exists public.project_domains (
  id uuid primary key,
  published_site_id uuid not null references public.published_sites(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hostname text not null,
  status text not null default 'pending',
  is_primary boolean not null default false,
  verification_token text null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_domains_status_check check (status in ('pending', 'verifying', 'active', 'failed'))
);

create unique index if not exists idx_published_sites_subdomain_lower on public.published_sites(lower(subdomain));
create index if not exists idx_published_sites_user_id on public.published_sites(user_id, updated_at desc);
create index if not exists idx_project_deployments_project_id on public.project_deployments(project_id, created_at desc);
create unique index if not exists idx_project_deployments_site_version on public.project_deployments(published_site_id, version_number);
create unique index if not exists idx_project_domains_hostname_lower on public.project_domains(lower(hostname));
create index if not exists idx_project_domains_project_id on public.project_domains(project_id, created_at desc);
create unique index if not exists idx_project_domains_primary_site on public.project_domains(published_site_id) where is_primary;

alter table public.published_sites enable row level security;
alter table public.project_deployments enable row level security;
alter table public.project_domains enable row level security;

drop policy if exists "published_sites_select_own" on public.published_sites;
drop policy if exists "published_sites_insert_own" on public.published_sites;
drop policy if exists "published_sites_update_own" on public.published_sites;
drop policy if exists "published_sites_delete_own" on public.published_sites;
drop policy if exists "project_deployments_select_own" on public.project_deployments;
drop policy if exists "project_deployments_insert_own" on public.project_deployments;
drop policy if exists "project_deployments_update_own" on public.project_deployments;
drop policy if exists "project_deployments_delete_own" on public.project_deployments;
drop policy if exists "project_domains_select_own" on public.project_domains;
drop policy if exists "project_domains_insert_own" on public.project_domains;
drop policy if exists "project_domains_update_own" on public.project_domains;
drop policy if exists "project_domains_delete_own" on public.project_domains;

create policy "published_sites_select_own" on public.published_sites
  for select to authenticated
  using (user_id = auth.uid());

create policy "published_sites_insert_own" on public.published_sites
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "published_sites_update_own" on public.published_sites
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "published_sites_delete_own" on public.published_sites
  for delete to authenticated
  using (user_id = auth.uid());

create policy "project_deployments_select_own" on public.project_deployments
  for select to authenticated
  using (user_id = auth.uid());

create policy "project_deployments_insert_own" on public.project_deployments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "project_deployments_update_own" on public.project_deployments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "project_deployments_delete_own" on public.project_deployments
  for delete to authenticated
  using (user_id = auth.uid());

create policy "project_domains_select_own" on public.project_domains
  for select to authenticated
  using (user_id = auth.uid());

create policy "project_domains_insert_own" on public.project_domains
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "project_domains_update_own" on public.project_domains
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "project_domains_delete_own" on public.project_domains
  for delete to authenticated
  using (user_id = auth.uid());
