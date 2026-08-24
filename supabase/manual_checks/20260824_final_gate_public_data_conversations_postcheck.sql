select
  c.relname as view_name,
  c.reloptions,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname='public_user_profiles';

select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname='public'
  and (
    (tablename='comments' and policyname='public can read comments for visible opportunities')
    or (tablename='opportunity_confirmations' and policyname='read verifications for visible opportunities')
  )
order by tablename, policyname;

select count(*) as conversation_update_policy_count
from pg_policies
where schemaname='public' and tablename='conversations' and cmd='UPDATE';

select
  role_name,
  has_table_privilege(role_name, 'public.conversations', 'SELECT') as can_select,
  has_table_privilege(role_name, 'public.conversations', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.conversations', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'public.conversations', 'DELETE') as can_delete
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;
