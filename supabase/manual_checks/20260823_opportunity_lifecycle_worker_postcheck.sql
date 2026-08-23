select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema='public'
  and (
    (table_name='opportunity_expiry_notifications' and column_name='processing_started_at')
    or
    (table_name='opportunity_purge_queue' and column_name='processing_started_at')
  )
order by table_name;

select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in ('claim_due_expiry_notifications','claim_due_purge_jobs')
order by p.proname;

select
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
from information_schema.table_constraints tc
join information_schema.check_constraints cc
  on cc.constraint_schema=tc.constraint_schema
 and cc.constraint_name=tc.constraint_name
where tc.table_schema='public'
  and tc.constraint_name in (
    'opportunity_expiry_notifications_status_check',
    'opportunity_purge_queue_status_check'
  )
order by tc.table_name;
