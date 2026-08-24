begin;

revoke select, insert, update, delete
on table public.privacy_consents
from anon, authenticated;

drop policy if exists "Users can insert their own consents"
on public.privacy_consents;

drop policy if exists "Users can read their own consents"
on public.privacy_consents;

create index if not exists privacy_consents_session_created_idx
  on public.privacy_consents (session_id, created_at desc)
  where session_id is not null;

create index if not exists privacy_consents_user_created_idx
  on public.privacy_consents (user_id, created_at desc)
  where user_id is not null;

create or replace function public.record_privacy_consent(
  p_user_id uuid,
  p_session_id text,
  p_ip_anonymized text,
  p_user_agent text,
  p_consent_version text,
  p_privacy_version text,
  p_terms_version text,
  p_analytics boolean,
  p_marketing boolean,
  p_geolocation boolean,
  p_preferences jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session_id text := btrim(coalesce(p_session_id, ''));
  v_existing_id uuid;
  v_new_id uuid;
  v_recent_count integer;
begin
  if length(v_session_id) < 8 or length(v_session_id) > 128 then
    raise exception 'Invalid session_id';
  end if;

  if v_session_id !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'Invalid session_id';
  end if;

  if p_consent_version <> '1.0'
     or p_privacy_version <> '1.0'
     or p_terms_version <> '1.0' then
    raise exception 'Unsupported consent version';
  end if;

  if jsonb_typeof(coalesce(p_preferences, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid preferences';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_session_id, 0));

  select count(*)
  into v_recent_count
  from public.privacy_consents
  where session_id = v_session_id
    and created_at >= now() - interval '1 hour';

  if v_recent_count >= 20 then
    raise exception 'Consent rate limit exceeded';
  end if;

  select id
  into v_existing_id
  from public.privacy_consents
  where user_id is not distinct from p_user_id
    and session_id = v_session_id
    and consent_version = p_consent_version
    and privacy_version = p_privacy_version
    and terms_version = p_terms_version
    and necessary = true
    and analytics = p_analytics
    and marketing = p_marketing
    and geolocation = p_geolocation
    and preferences = p_preferences
    and created_at >= now() - interval '5 minutes'
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'success', true,
      'inserted', false,
      'id', v_existing_id
    );
  end if;

  insert into public.privacy_consents (
    user_id,
    session_id,
    ip_anonymized,
    user_agent,
    consent_version,
    privacy_version,
    terms_version,
    necessary,
    analytics,
    marketing,
    geolocation,
    preferences,
    source
  )
  values (
    p_user_id,
    v_session_id,
    nullif(btrim(coalesce(p_ip_anonymized, '')), ''),
    nullif(left(btrim(coalesce(p_user_agent, '')), 256), ''),
    p_consent_version,
    p_privacy_version,
    p_terms_version,
    true,
    p_analytics,
    p_marketing,
    p_geolocation,
    p_preferences,
    'edge_function'
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'success', true,
    'inserted', true,
    'id', v_new_id
  );
end;
$$;

revoke all
on function public.record_privacy_consent(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, jsonb
)
from public, anon, authenticated;

grant execute
on function public.record_privacy_consent(
  uuid, text, text, text, text, text, text,
  boolean, boolean, boolean, jsonb
)
to service_role;

commit;
