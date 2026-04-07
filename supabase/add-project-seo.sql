alter table public.projects
  add column if not exists seo_json jsonb not null default '{}'::jsonb;

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
    coalesce(nullif(file_item->>'path', ''), '/file'),
    coalesce(file_item->>'content', ''),
    coalesce(nullif(file_item->>'type', ''), 'html'),
    coalesce(nullif(file_item->>'language', ''), 'html'),
    coalesce((file_item->>'sort_order')::integer, ord - 1)
  from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) with ordinality as file_rows(file_item, ord);
end;
$$;

grant execute on function public.save_project_snapshot(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
