begin;

-- DealRadar Security Hardening Phase 2A: Storage policy hardening.
-- IMPORTANT: storage.objects grants are managed by Supabase (supabase_storage_admin).
-- Do not attempt to override managed table privileges here. Authorization for browser
-- operations is enforced with Storage RLS policies and bucket configuration.
-- Existing public bucket architecture remains unchanged in this phase.

-- Replace duplicated opportunity-image object policies with one canonical
-- SELECT policy and one canonical DELETE policy, both owner-scoped.
drop policy if exists "Users can delete own opportunity images" on storage.objects;
drop policy if exists "Users can delete own opportunity images 1meoasy_0" on storage.objects;
drop policy if exists "Users can delete own opportunity images 1meoasy_1" on storage.objects;

drop policy if exists "Authenticated users can read own opportunity image objects" on storage.objects;
create policy "Authenticated users can read own opportunity image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'opportunity-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can delete own opportunity image objects" on storage.objects;
create policy "Authenticated users can delete own opportunity image objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'opportunity-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

commit;
