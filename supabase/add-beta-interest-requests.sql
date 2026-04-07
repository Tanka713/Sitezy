create table if not exists public.beta_interest_requests (
  id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  user_name text null,
  note text null,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_interest_requests_source_check
    check (source in ('signup', 'oauth', 'login', 'app'))
);

create unique index if not exists idx_beta_interest_requests_email_lower
  on public.beta_interest_requests(lower(email));

alter table public.beta_interest_requests enable row level security;

drop policy if exists "beta_interest_requests_select_own" on public.beta_interest_requests;
create policy "beta_interest_requests_select_own" on public.beta_interest_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "beta_interest_requests_insert_own" on public.beta_interest_requests;
create policy "beta_interest_requests_insert_own" on public.beta_interest_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "beta_interest_requests_update_own" on public.beta_interest_requests;
create policy "beta_interest_requests_update_own" on public.beta_interest_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "beta_interest_requests_delete_own" on public.beta_interest_requests;
create policy "beta_interest_requests_delete_own" on public.beta_interest_requests
  for delete to authenticated
  using (user_id = auth.uid());
