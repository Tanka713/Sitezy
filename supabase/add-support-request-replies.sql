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
  updated_at timestamptz not null default now()
);

alter table public.support_request_replies
  add column if not exists author_name text null;

update public.support_request_replies as replies
set author_name = nullif(
  btrim(
    coalesce(
      auth_user.raw_user_meta_data ->> 'full_name',
      auth_user.raw_user_meta_data ->> 'name',
      auth_user.raw_user_meta_data ->> 'display_name'
    )
  ),
  ''
)
from auth.users as auth_user
where replies.author_user_id = auth_user.id
  and (replies.author_name is null or btrim(replies.author_name) = '');

alter table public.support_request_replies
  drop constraint if exists support_request_replies_author_role_check;

alter table public.support_request_replies
  add constraint support_request_replies_author_role_check
  check (author_role in ('customer', 'customer_service', 'admin', 'system'));

alter table public.support_request_replies
  drop constraint if exists support_request_replies_email_delivery_status_check;

alter table public.support_request_replies
  add constraint support_request_replies_email_delivery_status_check
  check (email_delivery_status in ('sent', 'failed', 'not_requested'));

create index if not exists idx_support_request_replies_request_id
  on public.support_request_replies(request_id, created_at asc);

create index if not exists idx_support_request_replies_user_id
  on public.support_request_replies(user_id, created_at desc);

alter table public.support_request_replies enable row level security;

drop policy if exists "support_request_replies_select_own" on public.support_request_replies;
create policy "support_request_replies_select_own" on public.support_request_replies
  for select to authenticated
  using (user_id = auth.uid());
