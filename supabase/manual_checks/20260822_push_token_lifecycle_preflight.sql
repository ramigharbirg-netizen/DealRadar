select
  count(*) as total_push_tokens,
  count(distinct user_id) as users_with_tokens,
  count(*) - count(distinct token) as exact_duplicate_token_rows,
  count(*) filter (where token is null or btrim(token) = '') as blank_tokens
from public.push_tokens;

select
  count(*) as tokens_shared_between_users
from (
  select token
  from public.push_tokens
  group by token
  having count(distinct user_id) > 1
) shared;

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_tokens'
      and column_name = 'installation_id'
  ) as installation_id_already_exists,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_tokens'
      and column_name = 'last_seen_at'
  ) as last_seen_at_already_exists,
  to_regprocedure('public.register_push_installation(uuid,text,text)') as register_rpc_already_exists,
  to_regprocedure('public.unregister_push_installation(uuid)') as unregister_rpc_already_exists;
