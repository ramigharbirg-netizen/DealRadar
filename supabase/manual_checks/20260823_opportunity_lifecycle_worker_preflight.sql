select
  exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='opportunity_expiry_notifications'
      and column_name='processing_started_at'
  ) as expiry_processing_column_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='opportunity_purge_queue'
      and column_name='processing_started_at'
  ) as purge_processing_column_exists,
  to_regprocedure('public.claim_due_expiry_notifications(integer,integer)') as expiry_claim_rpc,
  to_regprocedure('public.claim_due_purge_jobs(integer,integer)') as purge_claim_rpc;
