select
  role_name,
  has_table_privilege(role_name, 'public.privacy_consents', 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.privacy_consents', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.privacy_consents', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.privacy_consents', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;

select
  count(*) as remaining_public_policies
from pg_policies
where schemaname='public'
  and tablename='privacy_consents';

select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='record_privacy_consent';

select indexname, indexdef
from pg_indexes
where schemaname='public'
  and tablename='privacy_consents'
order by indexname;
