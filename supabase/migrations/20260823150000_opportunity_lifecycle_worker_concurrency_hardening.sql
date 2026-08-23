begin;

alter table public.opportunity_expiry_notifications
  add column if not exists processing_started_at timestamptz;

alter table public.opportunity_purge_queue
  add column if not exists processing_started_at timestamptz;

alter table public.opportunity_expiry_notifications
  drop constraint if exists opportunity_expiry_notifications_status_check;

alter table public.opportunity_expiry_notifications
  add constraint opportunity_expiry_notifications_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'sent'::text,
        'skipped_no_token'::text,
        'skipped_obsolete'::text,
        'retry'::text
      ]
    )
  );

alter table public.opportunity_purge_queue
  drop constraint if exists opportunity_purge_queue_status_check;

alter table public.opportunity_purge_queue
  add constraint opportunity_purge_queue_status_check
  check (
    storage_status = any (
      array[
        'pending'::text,
        'processing'::text,
        'retry'::text,
        'completed'::text
      ]
    )
  );

create index if not exists opportunity_expiry_notifications_processing_idx
  on public.opportunity_expiry_notifications (processing_started_at)
  where status = 'processing' and sent_at is null;

create index if not exists opportunity_purge_queue_processing_idx
  on public.opportunity_purge_queue (processing_started_at)
  where storage_status = 'processing';

create or replace function public.claim_due_expiry_notifications(
  p_limit integer default 100,
  p_lease_minutes integer default 10
)
returns setof public.opportunity_expiry_notifications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Invalid limit';
  end if;

  if p_lease_minutes is null or p_lease_minutes < 1 or p_lease_minutes > 60 then
    raise exception 'Invalid lease';
  end if;

  return query
  with claimed as (
    select n.id
    from public.opportunity_expiry_notifications n
    where n.sent_at is null
      and (
        (
          n.status in ('pending', 'retry')
          and n.scheduled_for <= now()
          and n.next_attempt_at <= now()
        )
        or (
          n.status = 'processing'
          and n.processing_started_at is not null
          and n.processing_started_at <= now() - make_interval(mins => p_lease_minutes)
        )
      )
    order by n.scheduled_for, n.created_at
    limit p_limit
    for update skip locked
  )
  update public.opportunity_expiry_notifications n
  set
    status = 'processing',
    processing_started_at = now()
  from claimed
  where n.id = claimed.id
  returning n.*;
end;
$$;

create or replace function public.claim_due_purge_jobs(
  p_limit integer default 50,
  p_lease_minutes integer default 10
)
returns setof public.opportunity_purge_queue
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Invalid limit';
  end if;

  if p_lease_minutes is null or p_lease_minutes < 1 or p_lease_minutes > 60 then
    raise exception 'Invalid lease';
  end if;

  return query
  with claimed as (
    select q.id
    from public.opportunity_purge_queue q
    where
      (
        q.storage_status in ('pending', 'retry')
        and q.next_attempt_at <= now()
      )
      or (
        q.storage_status = 'processing'
        and q.processing_started_at is not null
        and q.processing_started_at <= now() - make_interval(mins => p_lease_minutes)
      )
    order by q.created_at
    limit p_limit
    for update skip locked
  )
  update public.opportunity_purge_queue q
  set
    storage_status = 'processing',
    processing_started_at = now()
  from claimed
  where q.id = claimed.id
  returning q.*;
end;
$$;

revoke all on function public.claim_due_expiry_notifications(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_expiry_notifications(integer, integer) to service_role;

revoke all on function public.claim_due_purge_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_purge_jobs(integer, integer) to service_role;

commit;
