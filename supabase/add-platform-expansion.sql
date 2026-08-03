alter table public.pages
  add column if not exists meta_json jsonb not null default '{}'::jsonb;

alter table public.pages
  add column if not exists revision integer not null default 1;

alter table public.project_deployments
  add column if not exists source_deployment_id uuid null references public.project_deployments(id) on delete set null;

create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_price_id text null,
  plan_name text not null default 'Private Beta',
  plan_status text not null default 'inactive',
  allowance_credits integer not null default 1000,
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  payment_method_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_accounts_plan_status_check check (
    plan_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  )
);

create table if not exists public.billing_invoices (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text null,
  status text not null default 'pending',
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  invoice_url text null,
  hosted_invoice_url text null,
  period_start timestamptz null,
  period_end timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_invoices_status_check check (
    status in ('draft', 'open', 'paid', 'void', 'uncollectible', 'pending')
  )
);

create table if not exists public.billing_credit_grants (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid null references auth.users(id) on delete set null,
  credits integer not null default 0,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_analytics_events (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  page_path text not null default '/',
  session_id text null,
  visitor_id text null,
  referrer text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_analytics_events_event_type_check check (
    event_type in ('session', 'page_view', 'lead_conversion', 'subscriber_conversion', 'deployment_published')
  )
);

create table if not exists public.project_analytics_daily_rollups (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rollup_date date not null,
  sessions integer not null default 0,
  page_views integer not null default 0,
  lead_conversions integer not null default 0,
  subscriber_conversions integer not null default 0,
  deployments_published integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (project_id, rollup_date)
);

create table if not exists public.project_webhooks (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  target_url text not null,
  secret text null,
  events_json jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_deliveries (
  id uuid primary key,
  webhook_id uuid not null references public.project_webhooks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  response_status integer null,
  response_body text null,
  next_attempt_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_deliveries_status_check check (status in ('pending', 'delivered', 'failed')),
  constraint webhook_deliveries_event_type_check check (
    event_type in ('lead.created', 'subscriber.created', 'deployment.published')
  )
);

create table if not exists public.project_comments (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id text null references public.pages(id) on delete cascade,
  section_id text null,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_name text null,
  body text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null,
  constraint project_comments_status_check check (status in ('open', 'resolved'))
);

create table if not exists public.project_page_operations (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id text not null references public.pages(id) on delete cascade,
  revision integer not null,
  expected_revision integer not null,
  operation_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_page_operations_type_check check (
    operation_type in ('replace_html', 'replace_sections', 'visual_edit', 'style_edit', 'structure_edit')
  )
);

create table if not exists public.project_page_locks (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id text not null references public.pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint project_page_locks_mode_check check (mode in ('code', 'transform'))
);

create table if not exists public.project_preview_shares (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id text null references public.pages(id) on delete cascade,
  token text not null unique,
  label text null,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create unique index if not exists idx_billing_accounts_customer on public.billing_accounts(stripe_customer_id)
  where stripe_customer_id is not null;
create index if not exists idx_billing_invoices_user_id on public.billing_invoices(user_id, created_at desc);
create index if not exists idx_billing_credit_grants_user_id on public.billing_credit_grants(user_id, created_at desc);
create index if not exists idx_project_analytics_events_project_date on public.project_analytics_events(project_id, created_at desc);
create index if not exists idx_project_analytics_events_type on public.project_analytics_events(project_id, event_type, created_at desc);
create index if not exists idx_project_analytics_rollups_project_date on public.project_analytics_daily_rollups(project_id, rollup_date desc);
create index if not exists idx_project_webhooks_project_id on public.project_webhooks(project_id, created_at desc);
create index if not exists idx_webhook_deliveries_webhook_id on public.webhook_deliveries(webhook_id, created_at desc);
create index if not exists idx_project_comments_project_id on public.project_comments(project_id, created_at desc);
create index if not exists idx_project_page_operations_page_revision on public.project_page_operations(page_id, revision asc);
create index if not exists idx_project_page_locks_project_id on public.project_page_locks(project_id, expires_at desc);
create index if not exists idx_project_preview_shares_project_id on public.project_preview_shares(project_id, created_at desc);

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
    meta_json,
    revision,
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
    coalesce(page_item->'meta_json', '{}'::jsonb),
    coalesce((page_item->>'revision')::integer, 1),
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

alter table public.billing_accounts enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_credit_grants enable row level security;
alter table public.project_analytics_events enable row level security;
alter table public.project_analytics_daily_rollups enable row level security;
alter table public.project_webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_page_operations enable row level security;
alter table public.project_page_locks enable row level security;
alter table public.project_preview_shares enable row level security;

drop policy if exists "billing_accounts_select_own" on public.billing_accounts;
create policy "billing_accounts_select_own" on public.billing_accounts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "billing_accounts_insert_own" on public.billing_accounts;
create policy "billing_accounts_insert_own" on public.billing_accounts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "billing_accounts_update_own" on public.billing_accounts;
create policy "billing_accounts_update_own" on public.billing_accounts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "billing_invoices_select_own" on public.billing_invoices;
create policy "billing_invoices_select_own" on public.billing_invoices
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "billing_credit_grants_select_own" on public.billing_credit_grants;
create policy "billing_credit_grants_select_own" on public.billing_credit_grants
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "project_analytics_events_select_own" on public.project_analytics_events;
create policy "project_analytics_events_select_own" on public.project_analytics_events
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "project_analytics_events_insert_own" on public.project_analytics_events;
create policy "project_analytics_events_insert_own" on public.project_analytics_events
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "project_analytics_daily_rollups_select_own" on public.project_analytics_daily_rollups;
create policy "project_analytics_daily_rollups_select_own" on public.project_analytics_daily_rollups
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "project_analytics_daily_rollups_insert_own" on public.project_analytics_daily_rollups;
create policy "project_analytics_daily_rollups_insert_own" on public.project_analytics_daily_rollups
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "project_analytics_daily_rollups_update_own" on public.project_analytics_daily_rollups;
create policy "project_analytics_daily_rollups_update_own" on public.project_analytics_daily_rollups
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "project_webhooks_select_own" on public.project_webhooks;
create policy "project_webhooks_select_own" on public.project_webhooks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "project_webhooks_insert_own" on public.project_webhooks;
create policy "project_webhooks_insert_own" on public.project_webhooks
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "project_webhooks_update_own" on public.project_webhooks;
create policy "project_webhooks_update_own" on public.project_webhooks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "project_webhooks_delete_own" on public.project_webhooks;
create policy "project_webhooks_delete_own" on public.project_webhooks
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "webhook_deliveries_select_own" on public.webhook_deliveries;
create policy "webhook_deliveries_select_own" on public.webhook_deliveries
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "project_comments_select_own" on public.project_comments;
create policy "project_comments_select_own" on public.project_comments
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_comments.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_comments_insert_own" on public.project_comments;
create policy "project_comments_insert_own" on public.project_comments
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_comments.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_comments_update_own" on public.project_comments;
create policy "project_comments_update_own" on public.project_comments
  for update to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_comments.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_comments.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_page_operations_select_own" on public.project_page_operations;
create policy "project_page_operations_select_own" on public.project_page_operations
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_operations.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_page_operations_insert_own" on public.project_page_operations;
create policy "project_page_operations_insert_own" on public.project_page_operations
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_operations.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_page_locks_select_own" on public.project_page_locks;
create policy "project_page_locks_select_own" on public.project_page_locks
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_locks.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_page_locks_insert_own" on public.project_page_locks;
create policy "project_page_locks_insert_own" on public.project_page_locks
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_locks.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_page_locks_update_own" on public.project_page_locks;
create policy "project_page_locks_update_own" on public.project_page_locks
  for update to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_locks.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_page_locks.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_preview_shares_select_own" on public.project_preview_shares;
create policy "project_preview_shares_select_own" on public.project_preview_shares
  for select to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_preview_shares.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_preview_shares_insert_own" on public.project_preview_shares;
create policy "project_preview_shares_insert_own" on public.project_preview_shares
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_preview_shares.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "project_preview_shares_update_own" on public.project_preview_shares;
create policy "project_preview_shares_update_own" on public.project_preview_shares
  for update to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_preview_shares.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_preview_shares.project_id
        and projects.user_id = auth.uid()
    )
  );
