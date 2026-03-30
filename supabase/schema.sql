create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brief_json jsonb not null,
  blueprint_json jsonb null,
  status text not null,
  editor_state_json jsonb null,
  ai_chats_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects(user_id, updated_at desc);

create table if not exists public.pages (
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

create table if not exists public.files (
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

create index if not exists idx_pages_project_id on public.pages(project_id, sort_order);
create index if not exists idx_files_project_id on public.files(project_id, sort_order);

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

alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.files enable row level security;

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

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

drop policy if exists "pages_select_own" on public.pages;
drop policy if exists "pages_insert_own" on public.pages;
drop policy if exists "pages_update_own" on public.pages;
drop policy if exists "pages_delete_own" on public.pages;

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

drop policy if exists "files_select_own" on public.files;
drop policy if exists "files_insert_own" on public.files;
drop policy if exists "files_update_own" on public.files;
drop policy if exists "files_delete_own" on public.files;

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
