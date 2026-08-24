select
  c.relname as view_name,
  c.reloptions,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relname='public_user_profiles';

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and (
    (tablename='comments' and policyname='public can read comments for visible opportunities')
    or (tablename='opportunity_confirmations' and policyname='read verifications for visible opportunities')
    or (tablename='conversations' and policyname='participants can update conversations')
  )
order by tablename, policyname;
