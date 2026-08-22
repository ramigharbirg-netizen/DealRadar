-- Read-only preflight.
select
  count(*) as total_requests,
  count(*) filter (where requester_email is null) as requester_email_null,
  count(*) filter (where owner_email is null) as owner_email_null,
  count(*) filter (where status <> 'pending') as non_pending_requests
from public.pickup_requests;

with resolved as (
  select
    pr.id,
    pr.opportunity_id,
    au.id as requester_id,
    o.user_id as owner_id
  from public.pickup_requests pr
  left join auth.users au
    on lower(trim(au.email)) = lower(trim(pr.requester_email))
  left join public.opportunities o
    on o.id = pr.opportunity_id
)
select
  count(*) as total_requests,
  count(*) filter (where requester_id is null) as unresolved_requesters,
  count(*) filter (where owner_id is null) as unresolved_owners,
  count(*) filter (where requester_id = owner_id) as self_requests,
  count(*) - count(distinct (opportunity_id, requester_id)) as duplicate_rows
from resolved;
