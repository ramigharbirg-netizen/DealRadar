select
  to_regprocedure('public.prepare_account_deletion(uuid)') as existing_prepare_rpc,
  (select is_nullable from information_schema.columns where table_schema='public' and table_name='opportunities' and column_name='user_id') as opportunities_user_id_nullable,
  (select delete_rule from information_schema.referential_constraints where constraint_schema='public' and constraint_name='opportunities_user_id_fkey') as opportunities_profile_delete_rule;
