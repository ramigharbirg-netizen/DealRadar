-- DealRadar lifecycle post-migration verification - READ ONLY

-- 1. Lifecycle columns
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'opportunities'
  and column_name in ('expires_at','lifecycle_status','expired_at','purge_after')
order by column_name;

-- 2. Opportunity lifecycle baseline
select
  count(*) as opportunities,
  count(*) filter (where lifecycle_status = 'active') as active,
  count(*) filter (where lifecycle_status = 'expired') as expired,
  count(*) filter (where expires_at is null) as missing_expiry
from public.opportunities;

-- 3. Reputation ledger coverage
select
  count(*) as reputation_events,
  count(*) filter (where event_type = 'bootstrap_snapshot') as bootstrap_events,
  count(*) filter (where event_type = 'bootstrap_verified_marker') as bootstrap_verified_markers
from public.reputation_events;

select
  count(*) as profiles_without_ledger
from public.user_profiles up
where not exists (
  select 1 from public.reputation_events re where re.user_id = up.user_id
);

-- 4. Reputation aggregate preservation.
-- Compare with preflight baseline captured on 2026-08-21:
-- profiles=16, points_total=120, trust_total=250,
-- lifetime_opportunities_total=18, verified_total=2, hidden_total=0.
select
  count(*) as profiles,
  coalesce(sum(points), 0) as points_total,
  coalesce(sum(trust_score), 0) as trust_total,
  coalesce(sum(total_opportunities), 0) as lifetime_opportunities_total,
  coalesce(sum(verified_deals), 0) as verified_total,
  coalesce(sum(hidden_deals), 0) as hidden_total
from public.user_profiles;

-- 5. Verification normalization
select
  count(*) filter (where coalesce(is_verified,false) = true) as verified_opportunities,
  count(*) filter (
    where coalesce(is_verified,false) is distinct from (coalesce(verified_count,0) >= 3)
  ) as verification_state_mismatches
from public.opportunities;

-- 6. Relevant triggers
select
  trigger_name,
  event_object_table,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and (
    event_object_table = 'opportunities'
    or event_object_table = 'opportunity_confirmations'
    or event_object_table = 'user_profiles'
  )
order by event_object_table, trigger_name, event_manipulation;

-- 7. Cron jobs
select jobid, jobname, schedule, active
from cron.job
where jobname in (
  'dealradar-opportunity-lifecycle-db',
  'dealradar-opportunity-lifecycle-worker'
)
order by jobname;

-- 8. Queues
select
  count(*) as pending_expiry_notifications
from public.opportunity_expiry_notifications
where sent_at is null;

select
  count(*) as pending_storage_purges
from public.opportunity_purge_queue
where storage_status in ('pending','retry');

-- 9. RLS policy names affected by lifecycle
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('opportunities','comments','opportunity_confirmations')
order by tablename, policyname;
