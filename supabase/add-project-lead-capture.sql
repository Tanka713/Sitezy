alter table public.projects
  add column if not exists integration_settings_json jsonb not null default '{}'::jsonb;

create table if not exists public.project_lead_submissions (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  page_path text not null default '/',
  form_id text null,
  name text null,
  email text null,
  message text null,
  fields_json jsonb not null default '{}'::jsonb,
  notification_email text null,
  notification_delivery_status text not null default 'not_requested',
  notification_error text null,
  notified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_lead_submissions_kind_check check (kind in ('contact', 'newsletter')),
  constraint project_lead_submissions_notification_delivery_status_check check (
    notification_delivery_status in ('sent', 'failed', 'not_requested')
  )
);

create table if not exists public.project_newsletter_subscribers (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text null,
  source_submission_id uuid null references public.project_lead_submissions(id) on delete set null,
  subscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_lead_submissions_project_id on public.project_lead_submissions(project_id, created_at desc);
create index if not exists idx_project_lead_submissions_user_id on public.project_lead_submissions(user_id, created_at desc);
create index if not exists idx_project_lead_submissions_kind on public.project_lead_submissions(project_id, kind, created_at desc);
create index if not exists idx_project_newsletter_subscribers_project_id on public.project_newsletter_subscribers(project_id, subscribed_at desc);
create index if not exists idx_project_newsletter_subscribers_user_id on public.project_newsletter_subscribers(user_id, subscribed_at desc);
create unique index if not exists idx_project_newsletter_subscribers_project_email_lower
  on public.project_newsletter_subscribers(project_id, lower(email));

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
    integration_settings_json,
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
    coalesce(p_project->'integration_settings_json', '{}'::jsonb),
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
    integration_settings_json = excluded.integration_settings_json,
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

grant execute on function public.save_project_snapshot(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

alter table public.project_lead_submissions enable row level security;
alter table public.project_newsletter_subscribers enable row level security;

drop policy if exists "project_lead_submissions_select_own" on public.project_lead_submissions;
drop policy if exists "project_lead_submissions_insert_own" on public.project_lead_submissions;
drop policy if exists "project_lead_submissions_update_own" on public.project_lead_submissions;
drop policy if exists "project_lead_submissions_delete_own" on public.project_lead_submissions;
drop policy if exists "project_newsletter_subscribers_select_own" on public.project_newsletter_subscribers;
drop policy if exists "project_newsletter_subscribers_insert_own" on public.project_newsletter_subscribers;
drop policy if exists "project_newsletter_subscribers_update_own" on public.project_newsletter_subscribers;
drop policy if exists "project_newsletter_subscribers_delete_own" on public.project_newsletter_subscribers;

create policy "project_lead_submissions_select_own" on public.project_lead_submissions
  for select to authenticated
  using (user_id = auth.uid());

create policy "project_lead_submissions_insert_own" on public.project_lead_submissions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "project_lead_submissions_update_own" on public.project_lead_submissions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "project_lead_submissions_delete_own" on public.project_lead_submissions
  for delete to authenticated
  using (user_id = auth.uid());

create policy "project_newsletter_subscribers_select_own" on public.project_newsletter_subscribers
  for select to authenticated
  using (user_id = auth.uid());

create policy "project_newsletter_subscribers_insert_own" on public.project_newsletter_subscribers
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "project_newsletter_subscribers_update_own" on public.project_newsletter_subscribers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "project_newsletter_subscribers_delete_own" on public.project_newsletter_subscribers
  for delete to authenticated
  using (user_id = auth.uid());
