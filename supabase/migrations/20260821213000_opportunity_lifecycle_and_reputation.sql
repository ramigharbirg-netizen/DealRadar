-- DealRadar - Opportunity lifecycle, durable reputation and automatic cleanup
-- 2026-08-21
--
-- Goals:
-- 1. Reputation already earned must not decrease when old content is purged.
-- 2. Deals have a configurable short expiry; other publication types default to 90 days.
-- 3. Expired opportunities leave public discovery immediately, remain recoverable by the owner
--    for 30 days, then are physically deleted together with dependent records.
-- 4. Storage cleanup is durable/retryable through a purge queue.
-- 5. Opportunity verification has one authoritative threshold: 3 confirmations.
-- 6. Public RLS never exposes expired/hidden content except to the owner, moderators, or
--    existing chat participants during the grace window.

begin;

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- 1. Durable reputation ledger
-- ---------------------------------------------------------------------------

create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  source_opportunity_id uuid,
  source_key text,
  points_delta integer not null default 0,
  trust_delta integer not null default 0,
  total_opportunities_delta integer not null default 0,
  verified_deals_delta integer not null default 0,
  hidden_deals_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint reputation_events_user_id_fkey
    foreign key (user_id)
    references public.user_profiles(user_id)
    on delete cascade,
  constraint reputation_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists reputation_events_source_key_unique
  on public.reputation_events(source_key)
  where source_key is not null;

create index if not exists reputation_events_user_created_idx
  on public.reputation_events(user_id, created_at desc);

create index if not exists reputation_events_source_opportunity_idx
  on public.reputation_events(source_opportunity_id)
  where source_opportunity_id is not null;

alter table public.reputation_events enable row level security;
revoke all on table public.reputation_events from anon, authenticated;
grant all on table public.reputation_events to service_role;

-- Snapshot the current LIVE totals exactly once. This preserves all reputation already earned
-- before the new ledger existed, without trying to reconstruct history from old content.
insert into public.reputation_events (
  user_id,
  event_type,
  source_key,
  points_delta,
  trust_delta,
  total_opportunities_delta,
  verified_deals_delta,
  hidden_deals_delta,
  metadata
)
select
  up.user_id,
  'bootstrap_snapshot',
  'bootstrap:' || up.user_id::text,
  coalesce(up.points, 0),
  coalesce(up.trust_score, 0),
  coalesce(up.total_opportunities, 0),
  coalesce(up.verified_deals, 0),
  coalesce(up.hidden_deals, 0),
  jsonb_build_object('source', 'pre_lifecycle_migration')
from public.user_profiles up
on conflict (source_key) where source_key is not null do nothing;

-- Seed zero-delta source markers for verifications that already existed before this
-- migration (including rows that already have >= 3 confirmations but whose legacy
-- is_verified flag may be stale). This prevents a later threshold transition from
-- awarding the same historical verification twice while preserving the exact LIVE
-- reputation snapshot above.
insert into public.reputation_events (
  user_id,
  event_type,
  source_opportunity_id,
  source_key,
  metadata
)
select
  o.user_id,
  'bootstrap_verified_marker',
  o.id,
  'opportunity_verified:' || o.id::text,
  jsonb_build_object('source', 'pre_lifecycle_migration')
from public.opportunities o
where coalesce(o.is_verified, false) = true
   or (
     select count(*)
     from public.opportunity_confirmations c
     where c.opportunity_id = o.id
   ) >= 3
on conflict (source_key) where source_key is not null do nothing;

create or replace function public.rebuild_user_reputation_from_ledger(target_user uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_points integer := 0;
  v_trust integer := 0;
  v_total integer := 0;
  v_verified integer := 0;
  v_hidden integer := 0;
  v_level text := 'new_member';
begin
  if target_user is null then
    return;
  end if;

  select
    coalesce(sum(points_delta), 0)::integer,
    coalesce(sum(trust_delta), 0)::integer,
    coalesce(sum(total_opportunities_delta), 0)::integer,
    coalesce(sum(verified_deals_delta), 0)::integer,
    coalesce(sum(hidden_deals_delta), 0)::integer
  into v_points, v_trust, v_total, v_verified, v_hidden
  from public.reputation_events
  where user_id = target_user;

  v_points := greatest(0, v_points);
  v_trust := least(100, greatest(0, v_trust));
  v_total := greatest(0, v_total);
  v_verified := greatest(0, v_verified);
  v_hidden := greatest(0, v_hidden);

  v_level := case
    when v_points >= 500 then 'elite_member'
    when v_points >= 200 then 'trusted_member'
    when v_points >= 50 then 'contributor'
    else 'new_member'
  end;

  perform set_config('dealradar.internal_reputation_update', '1', true);

  update public.user_profiles
  set
    points = v_points,
    trust_score = v_trust,
    total_opportunities = v_total,
    verified_deals = v_verified,
    hidden_deals = v_hidden,
    reputation_level = v_level,
    updated_at = now()
  where user_id = target_user;
end;
$$;

revoke all on function public.rebuild_user_reputation_from_ledger(uuid) from public, anon, authenticated;
grant execute on function public.rebuild_user_reputation_from_ledger(uuid) to service_role;

create or replace function public.insert_reputation_event(
  p_user_id uuid,
  p_event_type text,
  p_source_opportunity_id uuid,
  p_source_key text,
  p_points_delta integer,
  p_trust_delta integer,
  p_total_opportunities_delta integer,
  p_verified_deals_delta integer,
  p_hidden_deals_delta integer,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row_count integer := 0;
  v_inserted boolean := false;
begin
  if p_user_id is null then
    return false;
  end if;

  insert into public.reputation_events (
    user_id,
    event_type,
    source_opportunity_id,
    source_key,
    points_delta,
    trust_delta,
    total_opportunities_delta,
    verified_deals_delta,
    hidden_deals_delta,
    metadata
  )
  values (
    p_user_id,
    p_event_type,
    p_source_opportunity_id,
    p_source_key,
    coalesce(p_points_delta, 0),
    coalesce(p_trust_delta, 0),
    coalesce(p_total_opportunities_delta, 0),
    coalesce(p_verified_deals_delta, 0),
    coalesce(p_hidden_deals_delta, 0),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (source_key) where source_key is not null do nothing;

  get diagnostics v_row_count = row_count;
  v_inserted := v_row_count > 0;

  if v_inserted then
    perform public.rebuild_user_reputation_from_ledger(p_user_id);
  end if;

  return v_inserted;
end;
$$;

revoke all on function public.insert_reputation_event(uuid,text,uuid,text,integer,integer,integer,integer,integer,jsonb)
  from public, anon, authenticated;
grant execute on function public.insert_reputation_event(uuid,text,uuid,text,integer,integer,integer,integer,integer,jsonb)
  to service_role;

-- Remove the old delete-sensitive reputation trigger. Deleting content must never reduce
-- already-earned reputation.
drop trigger if exists trg_opportunity_reputation_update on public.opportunities;

drop function if exists public.handle_opportunity_reputation_update();
drop function if exists public.recalculate_user_reputation(uuid);

create or replace function public.handle_opportunity_reputation_ledger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    -- Match the legacy reputation formula: the 30-point trust base is applied only
    -- when a user performs their first reputation-bearing action.
    if not exists (
      select 1
      from public.reputation_events re
      where re.user_id = new.user_id
        and (
          re.event_type = 'reputation_base'
          or re.total_opportunities_delta > 0
        )
    ) then
      perform public.insert_reputation_event(
        new.user_id,
        'reputation_base',
        null,
        'reputation_base:' || new.user_id::text,
        0,
        30,
        0,
        0,
        0,
        jsonb_build_object('source', 'first_reputation_action')
      );
    end if;

    perform public.insert_reputation_event(
      new.user_id,
      'opportunity_created',
      new.id,
      'opportunity_created:' || new.id::text,
      5,
      3,
      1,
      0,
      0,
      jsonb_build_object('content_type', new.content_type, 'category', new.category)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Verification is a one-time positive achievement for an opportunity.
    if coalesce(old.is_verified, false) = false
       and coalesce(new.is_verified, false) = true then
      perform public.insert_reputation_event(
        new.user_id,
        'opportunity_verified',
        new.id,
        'opportunity_verified:' || new.id::text,
        15,
        8,
        0,
        1,
        0,
        jsonb_build_object('verified_count', coalesce(new.verified_count, 0))
      );
    end if;

    -- Moderation penalties persist if the content is later deleted, but they are reversed
    -- if moderators restore the content before deletion.
    if coalesce(old.is_hidden, false) = false
       and coalesce(new.is_hidden, false) = true then
      insert into public.reputation_events (
        user_id, event_type, source_opportunity_id,
        points_delta, trust_delta, hidden_deals_delta, metadata
      ) values (
        new.user_id,
        'opportunity_hidden',
        new.id,
        -20,
        -15,
        1,
        jsonb_build_object('hidden_reason', new.hidden_reason)
      );
      perform public.rebuild_user_reputation_from_ledger(new.user_id);
    elsif coalesce(old.is_hidden, false) = true
       and coalesce(new.is_hidden, false) = false then
      insert into public.reputation_events (
        user_id, event_type, source_opportunity_id,
        points_delta, trust_delta, hidden_deals_delta, metadata
      ) values (
        new.user_id,
        'opportunity_unhidden',
        new.id,
        20,
        15,
        -1,
        jsonb_build_object('restored', true)
      );
      perform public.rebuild_user_reputation_from_ledger(new.user_id);
    end if;

    return new;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.handle_opportunity_reputation_ledger() from public, anon, authenticated;
grant execute on function public.handle_opportunity_reputation_ledger() to service_role;

drop trigger if exists trg_opportunity_reputation_ledger_insert on public.opportunities;
drop trigger if exists trg_opportunity_reputation_ledger_update on public.opportunities;

create trigger trg_opportunity_reputation_ledger_insert
after insert on public.opportunities
for each row execute function public.handle_opportunity_reputation_ledger();

create trigger trg_opportunity_reputation_ledger_update
after update of is_verified, is_hidden on public.opportunities
for each row
when (
  old.is_verified is distinct from new.is_verified
  or old.is_hidden is distinct from new.is_hidden
)
execute function public.handle_opportunity_reputation_ledger();

-- Prevent clients from directly editing system/reputation fields through the broad profile
-- UPDATE policy. Server-side SECURITY DEFINER functions still work because auth.uid() is null
-- for scheduled/service operations or explicitly set internal operations.
create or replace function public.protect_user_profile_system_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_is_admin boolean := false;
  v_internal boolean := false;
begin
  v_internal := coalesce(
    current_setting('dealradar.internal_reputation_update', true),
    ''
  ) = '1';

  if v_internal or auth.uid() is null or old.user_id is distinct from auth.uid() then
    return new;
  end if;

  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = auth.uid()
      and ar.role in ('admin', 'owner')
  ) into v_is_admin;

  if v_is_admin then
    return new;
  end if;

  new.role := old.role;
  new.points := old.points;
  new.trust_score := old.trust_score;
  new.total_opportunities := old.total_opportunities;
  new.verified_deals := old.verified_deals;
  new.hidden_deals := old.hidden_deals;
  new.reputation_level := old.reputation_level;
  new.total_submissions := old.total_submissions;
  new.approved_submissions := old.approved_submissions;
  new.accepted_reports := old.accepted_reports;
  new.rejected_reports := old.rejected_reports;
  new.is_premium := old.is_premium;
  new.premium_until := old.premium_until;

  return new;
end;
$$;

drop trigger if exists trg_protect_user_profile_system_fields on public.user_profiles;

create trigger trg_protect_user_profile_system_fields
before update on public.user_profiles
for each row execute function public.protect_user_profile_system_fields();

-- ---------------------------------------------------------------------------
-- 2. One authoritative opportunity verification flow (threshold = 3)
-- ---------------------------------------------------------------------------

drop trigger if exists trg_handle_opportunity_confirmation on public.opportunity_confirmations;
drop trigger if exists trg_update_opportunity_verification on public.opportunity_confirmations;
drop trigger if exists trigger_recalculate_opportunity_verified_count_delete on public.opportunity_confirmations;
drop trigger if exists trigger_recalculate_opportunity_verified_count_insert on public.opportunity_confirmations;
drop trigger if exists trigger_update_opportunity_verified_count on public.opportunity_confirmations;

drop function if exists public.handle_opportunity_confirmation();
drop function if exists public.update_opportunity_verification();
drop function if exists public.recalculate_opportunity_verified_count();
drop function if exists public.update_opportunity_verified_count();

-- Remove invalid/orphan rows before making the relationship strict.
delete from public.opportunity_confirmations c
where c.opportunity_id is null
   or c.user_id is null
   or not exists (
     select 1 from public.opportunities o where o.id = c.opportunity_id
   );

alter table public.opportunity_confirmations
  alter column opportunity_id set not null,
  alter column user_id set not null;

alter table public.opportunity_confirmations
  drop constraint if exists opportunity_confirmations_opportunity_id_fkey;

alter table public.opportunity_confirmations
  add constraint opportunity_confirmations_opportunity_id_fkey
  foreign key (opportunity_id)
  references public.opportunities(id)
  on delete cascade;

create or replace function public.sync_opportunity_verification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_opportunity_id uuid;
  v_count integer;
begin
  v_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);

  -- During ON DELETE CASCADE from an opportunity, the parent row is already gone from
  -- normal visibility. In that case there is nothing to recalculate and, importantly,
  -- we avoid trying to UPDATE a row that is in the middle of being deleted.
  if not exists (
    select 1 from public.opportunities o where o.id = v_opportunity_id
  ) then
    return coalesce(new, old);
  end if;

  select count(*)::integer
  into v_count
  from public.opportunity_confirmations
  where opportunity_id = v_opportunity_id;

  update public.opportunities
  set
    verified_count = v_count,
    is_verified = (v_count >= 3),
    updated_at = now()
  where id = v_opportunity_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_opportunity_verification() from public, anon, authenticated;
grant execute on function public.sync_opportunity_verification() to service_role;

drop trigger if exists trg_sync_opportunity_verification on public.opportunity_confirmations;

create trigger trg_sync_opportunity_verification
after insert or delete on public.opportunity_confirmations
for each row execute function public.sync_opportunity_verification();

-- Normalize existing verification counters/status to the single threshold of 3.
-- Historical rewards remain unchanged because source markers were seeded above.
with confirmation_counts as (
  select
    o.id as opportunity_id,
    count(c.id)::bigint as confirmations_count
  from public.opportunities o
  left join public.opportunity_confirmations c
    on c.opportunity_id = o.id
  group by o.id
)
update public.opportunities o
set
  verified_count = cc.confirmations_count,
  is_verified = (cc.confirmations_count >= 3),
  updated_at = now()
from confirmation_counts cc
where o.id = cc.opportunity_id
  and (
    coalesce(o.verified_count, 0) is distinct from cc.confirmations_count
    or coalesce(o.is_verified, false) is distinct from (cc.confirmations_count >= 3)
  );

-- Make report-count maintenance safe during ON DELETE CASCADE of an opportunity.
create or replace function public.update_opportunity_reports()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_opportunity_id uuid;
  active_reports_count integer;
begin
  target_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);

  if not exists (
    select 1 from public.opportunities o where o.id = target_opportunity_id
  ) then
    return coalesce(new, old);
  end if;

  select count(*)::integer
  into active_reports_count
  from public.reports
  where opportunity_id = target_opportunity_id
    and status in ('pending', 'accepted');

  update public.opportunities
  set
    reports_count = active_reports_count,
    is_hidden = active_reports_count >= 3,
    updated_at = now()
  where id = target_opportunity_id;

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Opportunity lifecycle columns and defaults
-- ---------------------------------------------------------------------------

alter table public.opportunities
  add column if not exists expires_at timestamptz,
  add column if not exists lifecycle_status text,
  add column if not exists expired_at timestamptz,
  add column if not exists purge_after timestamptz;

update public.opportunities
set
  expires_at = coalesce(expires_at, now() + interval '90 days'),
  lifecycle_status = case
    when coalesce(expires_at, now() + interval '90 days') <= now() then 'expired'
    else 'active'
  end,
  expired_at = case
    when coalesce(expires_at, now() + interval '90 days') <= now()
      then coalesce(expired_at, now())
    else null
  end,
  purge_after = case
    when coalesce(expires_at, now() + interval '90 days') <= now()
      then coalesce(purge_after, coalesce(expires_at, now()) + interval '30 days')
    else null
  end
where expires_at is null
   or lifecycle_status is null;

alter table public.opportunities
  alter column expires_at set not null,
  alter column lifecycle_status set not null,
  alter column lifecycle_status set default 'active';

alter table public.opportunities
  drop constraint if exists opportunities_lifecycle_status_check;

alter table public.opportunities
  add constraint opportunities_lifecycle_status_check
  check (lifecycle_status in ('active', 'expired'));

create index if not exists opportunities_public_lifecycle_idx
  on public.opportunities(lifecycle_status, expires_at, created_at desc)
  where coalesce(is_hidden, false) = false;

create index if not exists opportunities_owner_lifecycle_idx
  on public.opportunities(user_id, lifecycle_status, expires_at desc);

create index if not exists opportunities_purge_due_idx
  on public.opportunities(purge_after)
  where lifecycle_status = 'expired' and purge_after is not null;

comment on column public.opportunities.expires_at is
  'When the opportunity stops being publicly discoverable. Deals are configurable up to 90 days; other types default to 90 days.';
comment on column public.opportunities.lifecycle_status is
  'DealRadar lifecycle state: active or expired.';
comment on column public.opportunities.expired_at is
  'Timestamp at which the opportunity was marked expired.';
comment on column public.opportunities.purge_after is
  'Earliest timestamp for permanent database/storage cleanup after the grace period.';

create or replace function public.set_opportunity_lifecycle_defaults()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_type text := coalesce(new.content_type, 'sale');
begin
  if v_type = 'deal' then
    if new.expires_at is null then
      new.expires_at := now() + interval '7 days';
    end if;

    if new.expires_at <= now() + interval '1 hour' then
      raise exception 'La scadenza di un affare deve essere almeno un''ora nel futuro';
    end if;

    if new.expires_at > now() + interval '90 days' then
      raise exception 'La scadenza di un affare non può superare 90 giorni';
    end if;
  else
    -- Standard marketplace/job/real-estate/free content always starts with 90 days.
    new.expires_at := now() + interval '90 days';
  end if;

  new.lifecycle_status := 'active';
  new.expired_at := null;
  new.purge_after := null;

  return new;
end;
$$;

drop trigger if exists trg_set_opportunity_lifecycle_defaults on public.opportunities;

create trigger trg_set_opportunity_lifecycle_defaults
before insert on public.opportunities
for each row execute function public.set_opportunity_lifecycle_defaults();

-- Extend the existing system-field protection with lifecycle protection. Owners may change
-- a deal expiry through the edit UI, but standard content can only be renewed through the RPC.
create or replace function public.protect_opportunity_system_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_is_admin boolean := false;
  v_internal boolean := false;
begin
  v_internal := coalesce(
    current_setting('dealradar.internal_lifecycle_update', true),
    ''
  ) = '1';

  if auth.uid() is not null
     and old.user_id = auth.uid()
     and not v_internal then

    select exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('admin', 'owner')
    ) into v_is_admin;

    if not v_is_admin then
      new.is_verified := old.is_verified;
      new.verified_count := old.verified_count;
      new.reports_count := old.reports_count;
      new.is_hidden := old.is_hidden;
      new.hidden_reason := old.hidden_reason;
      new.reports := old.reports;
      new.lifecycle_status := old.lifecycle_status;
      new.expired_at := old.expired_at;
      new.purge_after := old.purge_after;

      if coalesce(old.content_type, 'sale') <> 'deal' then
        new.expires_at := old.expires_at;
      elsif new.expires_at is distinct from old.expires_at then
        if old.lifecycle_status = 'expired'
           and old.purge_after is not null
           and old.purge_after <= now() then
          raise exception 'Il periodo di rinnovo è terminato';
        end if;

        if new.expires_at is null
           or new.expires_at <= now() + interval '1 hour' then
          raise exception 'La nuova scadenza deve essere almeno un''ora nel futuro';
        end if;

        if new.expires_at > now() + interval '90 days' then
          raise exception 'La nuova scadenza non può superare 90 giorni';
        end if;

        -- Editing the expiry of an expired deal is also its renewal.
        new.lifecycle_status := 'active';
        new.expired_at := null;
        new.purge_after := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Confirmation policy now that lifecycle columns exist.
-- Explicitly prohibit confirming your own opportunity at DB level.
drop policy if exists authenticated_users_can_verify on public.opportunity_confirmations;
create policy authenticated_users_can_verify
on public.opportunity_confirmations
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_confirmations.opportunity_id
      and o.user_id is distinct from auth.uid()
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

-- ---------------------------------------------------------------------------
-- 4. Reminder queue and durable storage purge queue
-- ---------------------------------------------------------------------------

create table if not exists public.opportunity_expiry_notifications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null,
  notification_type text not null,
  expires_at_snapshot timestamptz not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint opportunity_expiry_notifications_type_check
    check (notification_type in ('expiry_7d', 'expiry_3d')),
  constraint opportunity_expiry_notifications_status_check
    check (status in ('pending', 'sent', 'skipped_no_token', 'skipped_obsolete', 'retry'))
);

create unique index if not exists opportunity_expiry_notifications_cycle_unique
  on public.opportunity_expiry_notifications(
    opportunity_id,
    notification_type,
    expires_at_snapshot
  );

create index if not exists opportunity_expiry_notifications_due_idx
  on public.opportunity_expiry_notifications(next_attempt_at, scheduled_for)
  where sent_at is null and status in ('pending', 'retry');

alter table public.opportunity_expiry_notifications enable row level security;
revoke all on table public.opportunity_expiry_notifications from anon, authenticated;
grant all on table public.opportunity_expiry_notifications to service_role;

create table if not exists public.opportunity_purge_queue (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  owner_user_id uuid,
  image_urls jsonb not null default '[]'::jsonb,
  reason text not null,
  database_deleted_at timestamptz,
  storage_status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint opportunity_purge_queue_images_array_check
    check (jsonb_typeof(image_urls) = 'array'),
  constraint opportunity_purge_queue_status_check
    check (storage_status in ('pending', 'retry', 'completed'))
);

create index if not exists opportunity_purge_queue_due_idx
  on public.opportunity_purge_queue(next_attempt_at, created_at)
  where storage_status in ('pending', 'retry');

alter table public.opportunity_purge_queue enable row level security;
revoke all on table public.opportunity_purge_queue from anon, authenticated;
grant all on table public.opportunity_purge_queue to service_role;

-- Every physical opportunity DELETE (including legacy clients or direct owner deletes)
-- must first leave a durable Storage cleanup record. Opportunity UUIDs are immutable,
-- so one purge queue row per opportunity is sufficient and prevents duplicate jobs.
create unique index if not exists opportunity_purge_queue_opportunity_unique
  on public.opportunity_purge_queue(opportunity_id);

create or replace function public.capture_opportunity_purge_before_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason text;
begin
  v_reason := nullif(
    current_setting('dealradar.purge_reason', true),
    ''
  );

  insert into public.opportunity_purge_queue (
    opportunity_id,
    owner_user_id,
    image_urls,
    reason
  ) values (
    old.id,
    old.user_id,
    coalesce(old.images, '[]'::jsonb),
    coalesce(v_reason, 'direct_delete')
  )
  on conflict (opportunity_id) do nothing;

  return old;
end;
$$;

revoke all on function public.capture_opportunity_purge_before_delete()
  from public, anon, authenticated;
grant execute on function public.capture_opportunity_purge_before_delete()
  to service_role;

drop trigger if exists trg_capture_opportunity_purge_before_delete
  on public.opportunities;

create trigger trg_capture_opportunity_purge_before_delete
before delete on public.opportunities
for each row execute function public.capture_opportunity_purge_before_delete();

create or replace function public.schedule_opportunity_expiry_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_seven timestamptz;
  v_three timestamptz;
begin
  if new.lifecycle_status <> 'active' then
    return new;
  end if;

  -- Cancel only unsent reminders from previous cycles. Sent history stays auditable.
  delete from public.opportunity_expiry_notifications
  where opportunity_id = new.id
    and sent_at is null;

  v_seven := new.expires_at - interval '7 days';
  v_three := new.expires_at - interval '3 days';

  if v_seven > now() + interval '5 minutes' then
    insert into public.opportunity_expiry_notifications (
      opportunity_id, user_id, notification_type,
      expires_at_snapshot, scheduled_for, next_attempt_at
    ) values (
      new.id, new.user_id, 'expiry_7d', new.expires_at, v_seven, v_seven
    )
    on conflict do nothing;
  end if;

  if v_three > now() + interval '5 minutes' then
    insert into public.opportunity_expiry_notifications (
      opportunity_id, user_id, notification_type,
      expires_at_snapshot, scheduled_for, next_attempt_at
    ) values (
      new.id, new.user_id, 'expiry_3d', new.expires_at, v_three, v_three
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_schedule_opportunity_expiry_notifications_insert on public.opportunities;
drop trigger if exists trg_schedule_opportunity_expiry_notifications_update on public.opportunities;

create trigger trg_schedule_opportunity_expiry_notifications_insert
after insert on public.opportunities
for each row execute function public.schedule_opportunity_expiry_notifications();

create trigger trg_schedule_opportunity_expiry_notifications_update
after update of expires_at on public.opportunities
for each row
when (old.expires_at is distinct from new.expires_at)
execute function public.schedule_opportunity_expiry_notifications();

-- Schedule reminders for existing content backfilled by this migration.
insert into public.opportunity_expiry_notifications (
  opportunity_id, user_id, notification_type,
  expires_at_snapshot, scheduled_for, next_attempt_at
)
select id, user_id, 'expiry_7d', expires_at, expires_at - interval '7 days', expires_at - interval '7 days'
from public.opportunities
where lifecycle_status = 'active'
  and expires_at - interval '7 days' > now() + interval '5 minutes'
on conflict do nothing;

insert into public.opportunity_expiry_notifications (
  opportunity_id, user_id, notification_type,
  expires_at_snapshot, scheduled_for, next_attempt_at
)
select id, user_id, 'expiry_3d', expires_at, expires_at - interval '3 days', expires_at - interval '3 days'
from public.opportunities
where lifecycle_status = 'active'
  and expires_at - interval '3 days' > now() + interval '5 minutes'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Renewal, manual deletion and automatic purge
-- ---------------------------------------------------------------------------

create or replace function public.renew_my_opportunity(p_opportunity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_opportunity public.opportunities%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  select *
  into v_opportunity
  from public.opportunities
  where id = p_opportunity_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Opportunità non trovata';
  end if;

  if coalesce(v_opportunity.content_type, 'sale') = 'deal' then
    raise exception 'Gli affari devono essere rinnovati scegliendo una nuova data di scadenza dalla modifica annuncio';
  end if;

  if v_opportunity.lifecycle_status = 'expired'
     and v_opportunity.purge_after is not null
     and v_opportunity.purge_after <= now() then
    raise exception 'Il periodo di rinnovo è terminato';
  end if;

  if v_opportunity.lifecycle_status = 'active'
     and v_opportunity.expires_at > now() + interval '7 days' then
    raise exception 'Puoi rinnovare l’annuncio negli ultimi 7 giorni prima della scadenza';
  end if;

  perform set_config('dealradar.internal_lifecycle_update', '1', true);

  update public.opportunities
  set
    expires_at = now() + interval '90 days',
    lifecycle_status = 'active',
    expired_at = null,
    purge_after = null,
    updated_at = now()
  where id = p_opportunity_id
  returning * into v_opportunity;

  return to_jsonb(v_opportunity);
end;
$$;

revoke all on function public.renew_my_opportunity(uuid) from public, anon;
grant execute on function public.renew_my_opportunity(uuid) to authenticated;

create or replace function public.queue_and_delete_opportunity(
  p_opportunity_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_exists boolean := false;
begin
  select exists (
    select 1
    from public.opportunities
    where id = p_opportunity_id
  )
  into v_exists;

  if not v_exists then
    return false;
  end if;

  -- The BEFORE DELETE trigger captures owner/images for durable Storage cleanup.
  perform set_config(
    'dealradar.purge_reason',
    coalesce(nullif(btrim(p_reason), ''), 'unspecified'),
    true
  );

  delete from public.opportunities
  where id = p_opportunity_id;

  update public.opportunity_purge_queue
  set database_deleted_at = coalesce(database_deleted_at, now())
  where opportunity_id = p_opportunity_id;

  return true;
end;
$$;

revoke all on function public.queue_and_delete_opportunity(uuid,text) from public, anon, authenticated;
grant execute on function public.queue_and_delete_opportunity(uuid,text) to service_role;

create or replace function public.delete_my_opportunity(p_opportunity_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  select user_id
  into v_owner
  from public.opportunities
  where id = p_opportunity_id;

  if not found or v_owner is distinct from auth.uid() then
    raise exception 'Opportunità non trovata o non autorizzata';
  end if;

  return public.queue_and_delete_opportunity(p_opportunity_id, 'owner_delete');
end;
$$;

revoke all on function public.delete_my_opportunity(uuid) from public, anon;
grant execute on function public.delete_my_opportunity(uuid) to authenticated;

create or replace function public.process_opportunity_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expired integer := 0;
  v_purged integer := 0;
  v_notification_logs_cleaned integer := 0;
  v_purge_logs_cleaned integer := 0;
  v_record record;
begin
  update public.opportunities
  set
    lifecycle_status = 'expired',
    expired_at = coalesce(expired_at, now()),
    purge_after = coalesce(purge_after, expires_at + interval '30 days'),
    updated_at = now()
  where lifecycle_status = 'active'
    and expires_at <= now();

  get diagnostics v_expired = row_count;

  for v_record in
    select id
    from public.opportunities
    where lifecycle_status = 'expired'
      and purge_after is not null
      and purge_after <= now()
    order by purge_after
    limit 100
    for update skip locked
  loop
    if public.queue_and_delete_opportunity(v_record.id, 'expired_grace_elapsed') then
      v_purged := v_purged + 1;
    end if;
  end loop;

  delete from public.opportunity_expiry_notifications
  where sent_at is not null
    and sent_at < now() - interval '180 days';
  get diagnostics v_notification_logs_cleaned = row_count;

  delete from public.opportunity_purge_queue
  where storage_status = 'completed'
    and completed_at < now() - interval '30 days';
  get diagnostics v_purge_logs_cleaned = row_count;

  return jsonb_build_object(
    'expired', v_expired,
    'purged', v_purged,
    'notification_logs_cleaned', v_notification_logs_cleaned,
    'purge_logs_cleaned', v_purge_logs_cleaned,
    'processed_at', now()
  );
end;
$$;

revoke all on function public.process_opportunity_lifecycle() from public, anon, authenticated;
grant execute on function public.process_opportunity_lifecycle() to service_role;

-- ---------------------------------------------------------------------------
-- 6. RLS: active content is public; expired content is limited during grace.
-- ---------------------------------------------------------------------------

drop policy if exists "public read" on public.opportunities;

create policy "public read active opportunities"
on public.opportunities
for select
to public
using (
  (
    lifecycle_status = 'active'
    and expires_at > now()
    and coalesce(is_hidden, false) = false
  )
  or user_id = auth.uid()
  or exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = auth.uid()
      and ar.role in ('admin', 'owner')
  )
  or (
    lifecycle_status = 'expired'
    and purge_after > now()
    and exists (
      select 1
      from public.conversations c
      where c.opportunity_id = opportunities.id
        and auth.uid() in (c.requester_id, c.owner_id)
    )
  )
);

-- Linked public data follows the same lifecycle visibility as its opportunity.
drop policy if exists "public can read comments" on public.comments;
create policy "public can read comments for visible opportunities"
on public.comments
for select
to public
using (
  comments.user_id = auth.uid()
  or exists (
    select 1
    from public.opportunities o
    where o.id = comments.opportunity_id
  )
);

drop policy if exists "everyone_can_read_verifications"
  on public.opportunity_confirmations;
create policy "read verifications for visible opportunities"
on public.opportunity_confirmations
for select
to public
using (
  opportunity_confirmations.user_id = auth.uid()
  or exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_confirmations.opportunity_id
  )
);

-- New interactions are allowed only while the opportunity is publicly active.
drop policy if exists "authenticated users can insert comments" on public.comments;
create policy "authenticated users can insert comments"
on public.comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.opportunities o
    where o.id = comments.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

drop policy if exists "users can insert their own favorites" on public.favorites;
create policy "users can insert their own favorites"
on public.favorites
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.opportunities o
    where o.id = favorites.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

drop policy if exists "authenticated users can insert conversations" on public.conversations;
create policy "authenticated users can insert conversations"
on public.conversations
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id is distinct from owner_id
  and exists (
    select 1 from public.opportunities o
    where o.id = conversations.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
      and o.user_id is distinct from auth.uid()
  )
);

drop policy if exists "users can insert reports" on public.reports;
create policy "users can insert reports"
on public.reports
for insert
to authenticated
with check (
  auth.uid() = reporter_id
  and exists (
    select 1 from public.opportunities o
    where o.id = reports.opportunity_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and o.user_id is distinct from auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 7. Cron -> database lifecycle + Edge worker for push/storage cleanup
-- ---------------------------------------------------------------------------

create or replace function public.invoke_opportunity_lifecycle_worker()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, vault
as $$
declare
  v_internal_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
  into v_internal_secret
  from vault.decrypted_secrets
  where name = 'dealradar_internal_secret'
  limit 1;

  if v_internal_secret is null then
    raise warning 'Missing dealradar_internal_secret in Vault';
    return;
  end if;

  select net.http_post(
    url := 'https://vwvliyxrlzxkmdbrmtns.supabase.co/functions/v1/process-opportunity-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dealradar-secret', v_internal_secret
    ),
    body := jsonb_build_object('source', 'cron', 'requested_at', now())
  )
  into v_request_id;
end;
$$;

revoke all on function public.invoke_opportunity_lifecycle_worker() from public, anon, authenticated;
grant execute on function public.invoke_opportunity_lifecycle_worker() to service_role;

-- Idempotently replace the two DealRadar lifecycle jobs.
do $$
declare
  v_job record;
begin
  for v_job in
    select jobid from cron.job
    where jobname in (
      'dealradar-opportunity-lifecycle-db',
      'dealradar-opportunity-lifecycle-worker'
    )
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'dealradar-opportunity-lifecycle-db',
  '*/15 * * * *',
  $$select public.process_opportunity_lifecycle();$$
);

select cron.schedule(
  'dealradar-opportunity-lifecycle-worker',
  '5,20,35,50 * * * *',
  $$select public.invoke_opportunity_lifecycle_worker();$$
);

-- Rebuild every profile once from the bootstrap ledger to verify exact preservation.
do $$
declare
  v_user record;
begin
  for v_user in select user_id from public.user_profiles loop
    perform public.rebuild_user_reputation_from_ledger(v_user.user_id);
  end loop;
end
$$;

commit;
