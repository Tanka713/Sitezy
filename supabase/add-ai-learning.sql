create table if not exists public.ai_learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  sample_count integer not null default 0,
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generation_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  kind text not null default 'blueprint',
  brief_fingerprint text not null,
  model text not null,
  adaptive_enabled boolean not null default true,
  preference_snapshot_json jsonb null,
  applied_overrides_json jsonb not null default '{}'::jsonb,
  profile_snapshot_json jsonb null,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_generation_runs_kind_check check (kind in ('blueprint', 'page', 'section'))
);

create table if not exists public.ai_learning_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  generation_run_id uuid null references public.ai_generation_runs(id) on delete set null,
  event_type text not null,
  preference_snapshot_json jsonb null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_learning_events_type_check check (
    event_type in ('project_published', 'site_regenerated', 'section_regenerated')
  )
);

create index if not exists idx_ai_generation_runs_user_id on public.ai_generation_runs(user_id, created_at desc);
create index if not exists idx_ai_generation_runs_project_id on public.ai_generation_runs(project_id, created_at desc);
create index if not exists idx_ai_learning_events_user_id on public.ai_learning_events(user_id, created_at desc);
create index if not exists idx_ai_learning_events_project_id on public.ai_learning_events(project_id, created_at desc);
create index if not exists idx_ai_learning_profiles_confidence on public.ai_learning_profiles(confidence desc, updated_at desc);

alter table public.ai_learning_profiles enable row level security;
alter table public.ai_generation_runs enable row level security;
alter table public.ai_learning_events enable row level security;

drop policy if exists "ai_learning_profiles_select_own" on public.ai_learning_profiles;
drop policy if exists "ai_learning_profiles_insert_own" on public.ai_learning_profiles;
drop policy if exists "ai_learning_profiles_update_own" on public.ai_learning_profiles;
drop policy if exists "ai_learning_profiles_delete_own" on public.ai_learning_profiles;
drop policy if exists "ai_generation_runs_select_own" on public.ai_generation_runs;
drop policy if exists "ai_generation_runs_insert_own" on public.ai_generation_runs;
drop policy if exists "ai_generation_runs_update_own" on public.ai_generation_runs;
drop policy if exists "ai_generation_runs_delete_own" on public.ai_generation_runs;
drop policy if exists "ai_learning_events_select_own" on public.ai_learning_events;
drop policy if exists "ai_learning_events_insert_own" on public.ai_learning_events;
drop policy if exists "ai_learning_events_update_own" on public.ai_learning_events;
drop policy if exists "ai_learning_events_delete_own" on public.ai_learning_events;

create policy "ai_learning_profiles_select_own" on public.ai_learning_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy "ai_learning_profiles_insert_own" on public.ai_learning_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "ai_learning_profiles_update_own" on public.ai_learning_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ai_learning_profiles_delete_own" on public.ai_learning_profiles
  for delete to authenticated
  using (user_id = auth.uid());

create policy "ai_generation_runs_select_own" on public.ai_generation_runs
  for select to authenticated
  using (user_id = auth.uid());

create policy "ai_generation_runs_insert_own" on public.ai_generation_runs
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "ai_generation_runs_update_own" on public.ai_generation_runs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ai_generation_runs_delete_own" on public.ai_generation_runs
  for delete to authenticated
  using (user_id = auth.uid());

create policy "ai_learning_events_select_own" on public.ai_learning_events
  for select to authenticated
  using (user_id = auth.uid());

create policy "ai_learning_events_insert_own" on public.ai_learning_events
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "ai_learning_events_update_own" on public.ai_learning_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ai_learning_events_delete_own" on public.ai_learning_events
  for delete to authenticated
  using (user_id = auth.uid());
