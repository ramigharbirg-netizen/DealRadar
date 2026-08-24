select
  role_name,
  has_table_privilege(role_name, 'public.privacy_consents', 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.privacy_consents', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.privacy_consents', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.privacy_consents', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;

select
  count(*) as current_policies
from pg_policies
where schemaname='public'
  and tablename='privacy_consents';

select
  to_regprocedure(
    'public.record_privacy_consent(uuid,text,text,text,text,text,text,boolean,boolean,boolean,jsonb)'
  ) as record_rpc_exists;
