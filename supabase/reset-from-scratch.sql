drop table if exists public.project_domains;
drop table if exists public.project_deployments;
drop table if exists public.published_sites;
drop table if exists public.cms_entries;
drop table if exists public.cms_fields;
drop table if exists public.cms_collections;
drop table if exists public.beta_access;
drop table if exists public.beta_interest_requests;
drop table if exists public.project_generation_jobs;
drop table if exists public.support_request_replies;
drop table if exists public.support_requests;
drop sequence if exists public.support_request_ticket_number_seq;
drop table if exists public.user_settings;
drop table if exists public.user_media;
drop table if exists public.files;
drop table if exists public.pages;
drop table if exists public.projects;
drop function if exists public.claim_project_generation_job(text, integer);
drop function if exists public.save_project_snapshot(jsonb, jsonb, jsonb, jsonb, jsonb);

create table public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brief_json jsonb not null,
  blueprint_json jsonb null,
  seo_json jsonb not null default '{}'::jsonb,
  status text not null,
  editor_state_json jsonb null,
  ai_chats_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_user_id on public.projects(user_id, updated_at desc);

create table public.pages (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  slug text not null,
  purpose text not null default '',
  html text not null default '',
  sections_json jsonb not null default '[]'::jsonb,
  status text not null,
  error text null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.files (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  linked_page_id text null,
  name text not null,
  path text not null,
  content text not null,
  type text not null,
  language text not null,
  sort_order integer not null default 0
);

create table public.user_media (
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

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.support_request_ticket_number_seq
  start with 1001
  increment by 1;

create table public.support_requests (
  id text primary key,
  ticket_number bigint not null default nextval('public.support_request_ticket_number_seq'),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_name text null,
  kind text not null,
  subject text not null,
  message text not null,
  status text not null default 'pending',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_request_replies (
  id text primary key,
  request_id text not null references public.support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid null references auth.users(id) on delete set null,
  author_role text not null default 'customer_service',
  author_name text null,
  body text not null,
  email_delivery_status text not null default 'not_requested',
  email_error text null,
  emailed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_request_replies_author_role_check check (author_role in ('customer', 'customer_service', 'admin', 'system')),
  constraint support_request_replies_email_delivery_status_check check (email_delivery_status in ('sent', 'failed', 'not_requested'))
);

create table public.beta_access (
  id text primary key,
  email text not null,
  role text not null default 'customer',
  status text not null default 'invited',
  note text null,
  invited_by uuid null references auth.users(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_access_role_check check (role in ('customer', 'customer_service', 'admin')),
  constraint beta_access_status_check check (status in ('invited', 'active', 'revoked'))
);

create table public.beta_interest_requests (
  id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  user_name text null,
  note text null,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_interest_requests_source_check check (source in ('signup', 'oauth', 'login', 'app'))
);

create table public.project_generation_jobs (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'full_site',
  status text not null default 'queued',
  brief_json jsonb not null,
  progress_message text null,
  current_page_id text null,
  current_page_name text null,
  total_pages integer not null default 0,
  completed_pages integer not null default 0,
  locked_by text null,
  locked_at timestamptz null,
  heartbeat_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  last_error text null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_generation_jobs_kind_check check (kind in ('full_site')),
  constraint project_generation_jobs_status_check check (status in ('queued', 'running', 'completed', 'failed', 'canceled'))
);

create table public.published_sites (
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

create table public.project_deployments (
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

alter table public.published_sites
  add constraint published_sites_active_deployment_id_fkey
  foreign key (active_deployment_id) references public.project_deployments(id) on delete set null;

create table public.project_domains (
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

create table public.cms_collections (
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

create table public.cms_fields (
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

create table public.cms_entries (
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

create index idx_pages_project_id on public.pages(project_id, sort_order);
create index idx_files_project_id on public.files(project_id, sort_order);
create index idx_user_media_user_id on public.user_media(user_id, created_at desc);
create index idx_user_settings_updated_at on public.user_settings(updated_at desc);
create index idx_support_requests_user_id on public.support_requests(user_id, created_at desc);
create unique index idx_support_requests_ticket_number on public.support_requests(ticket_number);
create index idx_support_request_replies_request_id on public.support_request_replies(request_id, created_at asc);
create index idx_support_request_replies_user_id on public.support_request_replies(user_id, created_at desc);
create unique index idx_beta_access_email_lower on public.beta_access(lower(email));
create index idx_beta_access_status_role on public.beta_access(status, role, created_at desc);
create index idx_beta_access_user_id on public.beta_access(user_id);
create unique index idx_beta_interest_requests_email_lower on public.beta_interest_requests(lower(email));
create index idx_project_generation_jobs_project_id on public.project_generation_jobs(project_id, created_at desc);
create index idx_project_generation_jobs_status on public.project_generation_jobs(status, created_at asc);
create unique index idx_project_generation_jobs_active_project
  on public.project_generation_jobs(project_id)
  where status in ('queued', 'running');
create unique index idx_published_sites_subdomain_lower on public.published_sites(lower(subdomain));
create index idx_published_sites_user_id on public.published_sites(user_id, updated_at desc);
create index idx_project_deployments_project_id on public.project_deployments(project_id, created_at desc);
create unique index idx_project_deployments_site_version on public.project_deployments(published_site_id, version_number);
create unique index idx_project_domains_hostname_lower on public.project_domains(lower(hostname));
create index idx_project_domains_project_id on public.project_domains(project_id, created_at desc);
create unique index idx_project_domains_primary_site on public.project_domains(published_site_id) where is_primary;
create unique index idx_cms_collections_project_slug_lower on public.cms_collections(project_id, lower(slug));
create index idx_cms_collections_project_id on public.cms_collections(project_id, created_at desc);
create unique index idx_cms_fields_collection_key_lower on public.cms_fields(collection_id, lower(key));
create index idx_cms_fields_collection_id on public.cms_fields(collection_id, sort_order);
create unique index idx_cms_entries_collection_slug_lower on public.cms_entries(collection_id, lower(slug));
create index idx_cms_entries_collection_id on public.cms_entries(collection_id, sort_order, created_at asc);

alter sequence public.support_request_ticket_number_seq
  owned by public.support_requests.ticket_number;

insert into storage.buckets (id, name, public)
values ('sitezy-media', 'sitezy-media', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

create or replace function public.save_project_snapshot(
  p_project jsonb,
  p_editor_state jsonb default '{}'::jsonb,
  p_ai_chats jsonb default '[]'::jsonb,
  p_pages jsonb default '[]'::jsonb,
  p_files jsonb default '[]'::jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_project_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_project_id := nullif(p_project->>'id', '')::uuid;
  if v_project_id is null then
    raise exception 'Missing project id';
  end if;

  if exists (
    select 1
    from public.projects
    where id = v_project_id
      and user_id <> v_user_id
  ) then
    raise exception 'Permission denied';
  end if;

  insert into public.projects (
    id,
    user_id,
    name,
    brief_json,
    blueprint_json,
    seo_json,
    status,
    editor_state_json,
    ai_chats_json,
    created_at,
    updated_at
  )
  values (
    v_project_id,
    v_user_id,
    coalesce(nullif(p_project->>'name', ''), 'Untitled Project'),
    coalesce(p_project->'brief_json', '{}'::jsonb),
    p_project->'blueprint_json',
    coalesce(p_project->'seo_json', '{}'::jsonb),
    coalesce(nullif(p_project->>'status', ''), 'draft'),
    coalesce(p_editor_state, '{}'::jsonb),
    coalesce(p_ai_chats, '[]'::jsonb),
    coalesce(nullif(p_project->>'created_at', '')::timestamptz, now()),
    coalesce(nullif(p_project->>'updated_at', '')::timestamptz, now())
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    name = excluded.name,
    brief_json = excluded.brief_json,
    blueprint_json = excluded.blueprint_json,
    seo_json = excluded.seo_json,
    status = excluded.status,
    editor_state_json = excluded.editor_state_json,
    ai_chats_json = excluded.ai_chats_json,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  delete from public.pages where project_id = v_project_id;
  delete from public.files where project_id = v_project_id;

  insert into public.pages (
    id,
    project_id,
    name,
    slug,
    purpose,
    html,
    sections_json,
    status,
    error,
    sort_order,
    updated_at
  )
  select
    coalesce(nullif(page_item->>'id', ''), 'page-' || ord::text),
    v_project_id,
    coalesce(nullif(page_item->>'name', ''), 'Page'),
    coalesce(page_item->>'slug', ''),
    coalesce(page_item->>'purpose', ''),
    coalesce(page_item->>'html', ''),
    coalesce(page_item->'sections_json', '[]'::jsonb),
    coalesce(nullif(page_item->>'status', ''), 'done'),
    nullif(page_item->>'error', ''),
    coalesce((page_item->>'sort_order')::integer, ord - 1),
    coalesce(nullif(page_item->>'updated_at', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_pages, '[]'::jsonb)) with ordinality as page_rows(page_item, ord);

  insert into public.files (
    id,
    project_id,
    linked_page_id,
    name,
    path,
    content,
    type,
    language,
    sort_order
  )
  select
    coalesce(nullif(file_item->>'id', ''), 'file-' || ord::text),
    v_project_id,
    nullif(file_item->>'linked_page_id', ''),
    coalesce(nullif(file_item->>'name', ''), 'file'),
    coalesce(file_item->>'path', ''),
    coalesce(file_item->>'content', ''),
    coalesce(file_item->>'type', 'html'),
    coalesce(file_item->>'language', 'html'),
    coalesce((file_item->>'sort_order')::integer, ord - 1)
  from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) with ordinality as file_rows(file_item, ord);
end;
$$;

create or replace function public.claim_project_generation_job(
  p_worker_id text,
  p_stale_after_seconds integer default 120
) returns setof public.project_generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.project_generation_jobs;
begin
  with candidate as (
    select id
    from public.project_generation_jobs
    where status = 'queued'
      or (
        status = 'running'
        and coalesce(heartbeat_at, locked_at, updated_at, created_at) < now() - make_interval(secs => greatest(p_stale_after_seconds, 1))
      )
    order by created_at asc
    limit 1
    for update skip locked
  )
  update public.project_generation_jobs as jobs
  set
    status = 'running',
    locked_by = p_worker_id,
    locked_at = now(),
    heartbeat_at = now(),
    started_at = coalesce(jobs.started_at, now()),
    updated_at = now()
  from candidate
  where jobs.id = candidate.id
  returning jobs.* into v_job;

  if v_job.id is null then
    return;
  end if;

  return next v_job;
end;
$$;

grant execute on function public.save_project_snapshot(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.claim_project_generation_job(text, integer) to service_role;

alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.files enable row level security;
alter table public.user_media enable row level security;
alter table public.user_settings enable row level security;
alter table public.support_requests enable row level security;
alter table public.support_request_replies enable row level security;
alter table public.beta_access enable row level security;
alter table public.beta_interest_requests enable row level security;
alter table public.project_generation_jobs enable row level security;
alter table public.published_sites enable row level security;
alter table public.project_deployments enable row level security;
alter table public.project_domains enable row level security;
alter table public.cms_collections enable row level security;
alter table public.cms_fields enable row level security;
alter table public.cms_entries enable row level security;

create policy "projects_select_own" on public.projects
  for select to authenticated
  using (user_id = auth.uid());

create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "projects_update_own" on public.projects
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using (user_id = auth.uid());

create policy "pages_select_own" on public.pages
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "pages_insert_own" on public.pages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "pages_update_own" on public.pages
  for update to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = pages.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "pages_delete_own" on public.pages
  for delete to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "files_select_own" on public.files
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = files.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "files_insert_own" on public.files
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = files.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "files_update_own" on public.files
  for update to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = files.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = files.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "files_delete_own" on public.files
  for delete to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = files.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "user_media_select_own" on public.user_media
  for select to authenticated
  using (user_id = auth.uid());

create policy "user_media_insert_own" on public.user_media
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_media_update_own" on public.user_media
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_media_delete_own" on public.user_media
  for delete to authenticated
  using (user_id = auth.uid());

create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_settings_delete_own" on public.user_settings
  for delete to authenticated
  using (user_id = auth.uid());

create policy "support_requests_select_own" on public.support_requests
  for select to authenticated
  using (user_id = auth.uid());

create policy "support_requests_insert_own" on public.support_requests
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "support_requests_update_own" on public.support_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "support_requests_delete_own" on public.support_requests
  for delete to authenticated
  using (user_id = auth.uid());

create policy "support_request_replies_select_own" on public.support_request_replies
  for select to authenticated
  using (user_id = auth.uid());

create policy "beta_access_select_own" on public.beta_access
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "beta_interest_requests_select_own" on public.beta_interest_requests
  for select to authenticated
  using (user_id = auth.uid());

create policy "beta_interest_requests_insert_own" on public.beta_interest_requests
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "beta_interest_requests_update_own" on public.beta_interest_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "beta_interest_requests_delete_own" on public.beta_interest_requests
  for delete to authenticated
  using (user_id = auth.uid());

create policy "project_generation_jobs_select_own" on public.project_generation_jobs
  for select to authenticated
  using (user_id = auth.uid());

create policy "project_generation_jobs_insert_own" on public.project_generation_jobs
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "project_generation_jobs_update_own" on public.project_generation_jobs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "project_generation_jobs_delete_own" on public.project_generation_jobs
  for delete to authenticated
  using (user_id = auth.uid());

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
