create sequence if not exists public.support_request_ticket_number_seq
  start with 1001
  increment by 1;

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

create unique index if not exists idx_support_requests_ticket_number
  on public.support_requests(ticket_number);
