begin;

create or replace function public.register_push_installation(
  p_installation_id uuid,
  p_token text,
  p_platform text default 'android'::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
  v_platform text := lower(btrim(coalesce(p_platform, 'android')));
  v_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_installation_id is null then raise exception 'Missing installation id'; end if;
  if length(v_token) < 20 or length(v_token) > 4096 then raise exception 'Invalid push token'; end if;
  if v_platform not in ('android','ios') then raise exception 'Invalid platform'; end if;

  delete from public.push_tokens
  where token = v_token
    and user_id = v_user_id
    and installation_id is distinct from p_installation_id;

  insert into public.push_tokens (
    user_id, token, platform, installation_id, created_at, updated_at, last_seen_at
  )
  values (
    v_user_id, v_token, v_platform, p_installation_id, now(), now(), now()
  )
  on conflict (installation_id)
    where installation_id is not null
  do update set
    token = excluded.token,
    platform = excluded.platform,
    updated_at = now(),
    last_seen_at = now()
  where public.push_tokens.user_id = v_user_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Installation already registered to another user';
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_id,
    'installation_id', p_installation_id
  );
end;
$$;

revoke all on function public.register_push_installation(uuid,text,text)
from public, anon;

grant execute on function public.register_push_installation(uuid,text,text)
to authenticated, service_role;

commit;
