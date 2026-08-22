-- READ-ONLY preflight for DealRadar Storage Hardening Phase 2A.

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('avatars', 'opportunity-images')
order by id;

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

select
  role_name,
  has_table_privilege(role_name, 'storage.objects', 'SELECT') as can_select,
  has_table_privilege(role_name, 'storage.objects', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'storage.objects', 'UPDATE') as can_update,
  has_table_privilege(role_name, 'storage.objects', 'DELETE') as can_delete,
  has_table_privilege(role_name, 'storage.objects', 'TRUNCATE') as can_truncate,
  has_table_privilege(role_name, 'storage.objects', 'TRIGGER') as can_trigger,
  has_table_privilege(role_name, 'storage.objects', 'REFERENCES') as can_references
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
order by role_name;
