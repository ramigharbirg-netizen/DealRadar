-- Run after migration 20260822211500.
select
  count(*) as total_requests,
  count(*) filter (where requester_id is null) as requester_id_null,
  count(*) filter (where owner_id is null) as owner_id_null,
  count(*) - count(distinct (opportunity_id, requester_id)) as duplicate_rows
from public.pickup_requests;

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'pickup_requests'
order by policyname;

select
  p.proname as function_name,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_pickup_request', 'secure_pickup_request_insert')
order by p.proname;
