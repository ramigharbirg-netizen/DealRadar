begin;

-- Apply only after the RPC frontend and updated export-user-data Edge Function
-- have been deployed and regression-tested.

-- No client may insert/update/delete pickup request rows directly anymore.
revoke insert, update, delete on table public.pickup_requests from anon;
revoke insert, update, delete on table public.pickup_requests from authenticated;

drop policy if exists "authenticated users can insert normalized pickup requests"
  on public.pickup_requests;

-- Historical email copies are no longer used for authorization or GDPR export.
-- UUIDs are now authoritative, so remove duplicated email data.
update public.pickup_requests
set requester_email = null,
    owner_email = null
where requester_email is not null
   or owner_email is not null;

alter table public.pickup_requests
  alter column requester_id set not null,
  alter column owner_id set not null;

commit;
