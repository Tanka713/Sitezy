alter table public.beta_access drop constraint if exists beta_access_role_check;

update public.beta_access
set role = 'customer'
where role = 'beta_user';

update public.beta_access
set role = 'customer_service'
where role = 'moderator';

alter table public.beta_access alter column role set default 'customer';

alter table public.beta_access add constraint beta_access_role_check
  check (role in ('customer', 'customer_service', 'admin'));
