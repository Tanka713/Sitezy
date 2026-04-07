create sequence if not exists public.support_request_ticket_number_seq
  start with 1001
  increment by 1;

create table if not exists public.support_requests (
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

alter table public.support_requests
  alter column status set default 'pending';

alter table public.support_requests
  add column if not exists ticket_number bigint;

alter table public.support_requests
  alter column ticket_number set default nextval('public.support_request_ticket_number_seq');

update public.support_requests
set ticket_number = nextval('public.support_request_ticket_number_seq')
where ticket_number is null;

alter table public.support_requests
  alter column ticket_number set not null;

alter sequence public.support_request_ticket_number_seq
  owned by public.support_requests.ticket_number;

select setval(
  'public.support_request_ticket_number_seq',
  greatest(coalesce((select max(ticket_number) from public.support_requests), 1000), 1000),
  true
);

create table if not exists public.support_request_replies (
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

create index if not exists idx_support_requests_user_id on public.support_requests(user_id, created_at desc);
create unique index if not exists idx_support_requests_ticket_number on public.support_requests(ticket_number);
create index if not exists idx_support_request_replies_request_id on public.support_request_replies(request_id, created_at asc);
create index if not exists idx_support_request_replies_user_id on public.support_request_replies(user_id, created_at desc);

alter table public.support_requests enable row level security;
alter table public.support_request_replies enable row level security;

drop policy if exists "support_requests_select_own" on public.support_requests;
create policy "support_requests_select_own" on public.support_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "support_requests_insert_own" on public.support_requests;
create policy "support_requests_insert_own" on public.support_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "support_requests_update_own" on public.support_requests;
create policy "support_requests_update_own" on public.support_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "support_requests_delete_own" on public.support_requests;
create policy "support_requests_delete_own" on public.support_requests
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "support_request_replies_select_own" on public.support_request_replies;
create policy "support_request_replies_select_own" on public.support_request_replies
  for select to authenticated
  using (user_id = auth.uid());
