-- READ-ONLY postcheck for DealRadar Storage Hardening Phase 2A.
-- storage.objects table grants are Supabase-managed and intentionally reported,
-- not treated as a DealRadar-controlled hardening target.

select
  grantee,
  privilege_type,
  grantor,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'storage'
  and table_name = 'objects'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;

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
  count(*) filter (
    where policyname in (
      'Users can delete own opportunity images',
      'Users can delete own opportunity images 1meoasy_0',
      'Users can delete own opportunity images 1meoasy_1'
    )
  ) as legacy_opportunity_image_policies_left,
  count(*) filter (
    where policyname = 'Authenticated users can read own opportunity image objects'
  ) as canonical_select_policy,
  count(*) filter (
    where policyname = 'Authenticated users can delete own opportunity image objects'
  ) as canonical_delete_policy
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects';

select
  id as bucket_id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('avatars', 'opportunity-images')
order by id;
