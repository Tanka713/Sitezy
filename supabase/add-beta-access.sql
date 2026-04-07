create table if not exists public.beta_access (
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

update public.beta_access
set role = 'customer'
where role = 'beta_user';

update public.beta_access
set role = 'customer_service'
where role = 'moderator';

alter table public.beta_access drop constraint if exists beta_access_role_check;
alter table public.beta_access alter column role set default 'customer';
alter table public.beta_access add constraint beta_access_role_check
  check (role in ('customer', 'customer_service', 'admin'));

create unique index if not exists idx_beta_access_email_lower on public.beta_access(lower(email));
create index if not exists idx_beta_access_status_role on public.beta_access(status, role, created_at desc);
create index if not exists idx_beta_access_user_id on public.beta_access(user_id);

alter table public.beta_access enable row level security;

drop policy if exists "beta_access_select_own" on public.beta_access;
create policy "beta_access_select_own" on public.beta_access
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
