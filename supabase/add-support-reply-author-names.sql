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
