select indexname,indexdef
from pg_indexes
where schemaname='public' and tablename='push_tokens'
order by indexname;

select p.proname as function_name,p.prosecdef as security_definer,p.proconfig as configuration,
has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_can_execute,
pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='register_push_installation';

select count(*) as total_rows,
count(*) filter (where installation_id is null) as legacy_null_installations,
count(distinct installation_id) filter (where installation_id is not null) as distinct_installation_ids
from public.push_tokens;
