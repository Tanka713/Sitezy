create table if not exists public.project_generation_jobs (
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

create index if not exists idx_project_generation_jobs_project_id on public.project_generation_jobs(project_id, created_at desc);
create index if not exists idx_project_generation_jobs_status on public.project_generation_jobs(status, created_at asc);
create unique index if not exists idx_project_generation_jobs_active_project
  on public.project_generation_jobs(project_id)
  where status in ('queued', 'running');

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

grant execute on function public.claim_project_generation_job(text, integer) to service_role;

alter table public.project_generation_jobs enable row level security;

drop policy if exists "project_generation_jobs_select_own" on public.project_generation_jobs;
drop policy if exists "project_generation_jobs_insert_own" on public.project_generation_jobs;
drop policy if exists "project_generation_jobs_update_own" on public.project_generation_jobs;
drop policy if exists "project_generation_jobs_delete_own" on public.project_generation_jobs;

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
