begin;

-- Phase 2B: secure pickup request identity and authorization while keeping
-- backward compatibility with the currently deployed frontend.

alter table public.pickup_requests
  add column if not exists requester_id uuid,
  add column if not exists owner_id uuid;

-- Resolve historical requester IDs from Supabase Auth, not user_profiles.email.
update public.pickup_requests pr
set requester_id = au.id
from auth.users au
where pr.requester_id is null
  and pr.requester_email is not null
  and lower(trim(au.email)) = lower(trim(pr.requester_email));

-- The owner is authoritative on the opportunity row.
update public.pickup_requests pr
set owner_id = o.user_id
from public.opportunities o
where pr.owner_id is null
  and o.id = pr.opportunity_id;

-- Refuse to continue if historical data cannot be mapped deterministically.
do $$
begin
  if exists (
    select 1
    from public.pickup_requests
    where requester_id is null or owner_id is null
  ) then
    raise exception 'pickup_requests hardening aborted: unresolved requester_id/owner_id rows remain';
  end if;
end;
$$;

-- Preserve the oldest historical request for each requester/opportunity pair.
with ranked as (
  select
    id,
    row_number() over (
      partition by opportunity_id, requester_id
      order by created_at asc, id asc
    ) as rn
  from public.pickup_requests
)
delete from public.pickup_requests pr
using ranked r
where pr.id = r.id
  and r.rn > 1;

create unique index if not exists pickup_requests_unique_requester_opportunity_idx
  on public.pickup_requests (opportunity_id, requester_id);

create index if not exists pickup_requests_requester_id_idx
  on public.pickup_requests (requester_id, created_at desc);

create index if not exists pickup_requests_owner_id_idx
  on public.pickup_requests (owner_id, created_at desc);

-- Normalize every direct INSERT, including requests from an older frontend.
-- Client-supplied identity, names, email and status are never trusted.
create or replace function public.secure_pickup_request_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_requester_id uuid;
  v_owner_id uuid;
  v_owner_name text;
  v_requester_name text;
begin
  v_requester_id := auth.uid();

  if v_requester_id is null then
    raise exception 'Utente non autenticato';
  end if;

  select
    o.user_id,
    coalesce(o.user_name, owner_profile.display_name, 'Utente'),
    requester_profile.display_name
  into
    v_owner_id,
    v_owner_name,
    v_requester_name
  from public.opportunities o
  left join public.user_profiles owner_profile
    on owner_profile.user_id = o.user_id
  left join public.user_profiles requester_profile
    on requester_profile.user_id = v_requester_id
  where o.id = new.opportunity_id
    and o.lifecycle_status = 'active'
    and o.expires_at > now()
    and coalesce(o.is_hidden, false) = false;

  if v_owner_id is null then
    raise exception 'Opportunità non disponibile';
  end if;

  if v_owner_id = v_requester_id then
    raise exception 'Non puoi richiedere il ritiro della tua opportunità';
  end if;

  -- Duplicate requests are idempotent: silently ignore the extra row.
  if exists (
    select 1
    from public.pickup_requests existing
    where existing.opportunity_id = new.opportunity_id
      and existing.requester_id = v_requester_id
  ) then
    return null;
  end if;

  new.requester_id := v_requester_id;
  new.owner_id := v_owner_id;
  new.requester_name := coalesce(v_requester_name, 'Utente');
  new.owner_name := v_owner_name;
  -- New rows do not duplicate account emails in this table.
  new.requester_email := null;
  new.owner_email := null;
  new.status := 'pending';

  return new;
end;
$$;

revoke all on function public.secure_pickup_request_insert() from public, anon, authenticated;
grant execute on function public.secure_pickup_request_insert() to service_role;

drop trigger if exists trg_secure_pickup_request_insert on public.pickup_requests;
create trigger trg_secure_pickup_request_insert
before insert on public.pickup_requests
for each row execute function public.secure_pickup_request_insert();

-- Replace email-based authorization with immutable user UUIDs.
drop policy if exists "Users can read own pickup requests" on public.pickup_requests;
create policy "participants can read own pickup requests"
on public.pickup_requests
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = owner_id);

drop policy if exists "authenticated users can insert pickup requests" on public.pickup_requests;
create policy "authenticated users can insert normalized pickup requests"
on public.pickup_requests
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and owner_id is distinct from auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.opportunities o
    where o.id = pickup_requests.opportunity_id
      and o.user_id = pickup_requests.owner_id
      and o.lifecycle_status = 'active'
      and o.expires_at > now()
      and coalesce(o.is_hidden, false) = false
  )
);

-- Canonical RPC for the new frontend. It accepts only the opportunity UUID.
create or replace function public.create_pickup_request(p_opportunity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_request_id uuid;
  v_created boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_opportunity_id is null then
    raise exception 'Opportunità non valida';
  end if;

  insert into public.pickup_requests (opportunity_id)
  values (p_opportunity_id)
  returning id into v_request_id;

  if v_request_id is not null then
    v_created := true;
  else
    select pr.id
    into v_request_id
    from public.pickup_requests pr
    where pr.opportunity_id = p_opportunity_id
      and pr.requester_id = v_user_id
    limit 1;
  end if;

  return jsonb_build_object(
    'success', true,
    'created', v_created,
    'request_id', v_request_id
  );
end;
$$;

revoke all on function public.create_pickup_request(uuid) from public, anon;
grant execute on function public.create_pickup_request(uuid) to authenticated;

-- Display-name propagation now follows UUIDs rather than mutable email values.
create or replace function public.update_my_display_name(new_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_profiles integer := 0;
  v_opportunities integer := 0;
  v_comments integer := 0;
  v_messages integer := 0;
  v_pickup_requesters integer := 0;
  v_pickup_owners integer := 0;
begin
  v_user_id := auth.uid();

  v_name := trim(regexp_replace(coalesce(new_display_name, ''), '\s+', ' ', 'g'));

  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Il nome deve contenere almeno 2 caratteri';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'Il nome non può superare 80 caratteri';
  end if;

  if lower(v_name) = lower('Utente eliminato') then
    raise exception 'Questo nome non può essere utilizzato';
  end if;

  update public.user_profiles
  set display_name = v_name, updated_at = now()
  where user_id = v_user_id;
  get diagnostics v_profiles = row_count;

  if v_profiles = 0 then
    raise exception 'Profilo utente non trovato';
  end if;

  update public.opportunities set user_name = v_name where user_id = v_user_id;
  get diagnostics v_opportunities = row_count;

  update public.comments set user_name = v_name where user_id = v_user_id;
  get diagnostics v_comments = row_count;

  update public.conversation_messages set sender_name = v_name where sender_id = v_user_id;
  get diagnostics v_messages = row_count;

  update public.pickup_requests set requester_name = v_name where requester_id = v_user_id;
  get diagnostics v_pickup_requesters = row_count;

  update public.pickup_requests set owner_name = v_name where owner_id = v_user_id;
  get diagnostics v_pickup_owners = row_count;

  return jsonb_build_object(
    'success', true,
    'display_name', v_name,
    'updated', jsonb_build_object(
      'user_profiles', v_profiles,
      'opportunities', v_opportunities,
      'comments', v_comments,
      'conversation_messages', v_messages,
      'pickup_requesters', v_pickup_requesters,
      'pickup_owners', v_pickup_owners
    )
  );
end;
$$;

revoke all on function public.update_my_display_name(text) from public, anon;
grant execute on function public.update_my_display_name(text) to authenticated;

commit;
