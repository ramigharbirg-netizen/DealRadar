-- Run after deployment and migration 20260822213000.
select
  count(*) as total_requests,
  count(*) filter (where requester_email is not null) as requester_emails_left,
  count(*) filter (where owner_email is not null) as owner_emails_left,
  count(*) filter (where requester_id is null) as requester_id_null,
  count(*) filter (where owner_id is null) as owner_id_null
from public.pickup_requests;

select
  has_table_privilege('authenticated', 'public.pickup_requests', 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', 'public.pickup_requests', 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', 'public.pickup_requests', 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', 'public.pickup_requests', 'DELETE') as authenticated_delete,
  has_function_privilege('authenticated', 'public.create_pickup_request(uuid)', 'EXECUTE') as authenticated_rpc_execute;
