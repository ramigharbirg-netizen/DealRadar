begin;

alter table public.push_tokens
  add column if not exists installation_id uuid,
  add column if not exists last_seen_at timestamptz;

update public.push_tokens
set last_seen_at = coalesce(updated_at, created_at, now())
where last_seen_at is null;

create unique index if not exists push_tokens_installation_id_key
  on public.push_tokens (installation_id)
  where installation_id is not null;

create index if not exists push_tokens_user_last_seen_idx
  on public.push_tokens (user_id, last_seen_at desc);

create or replace function public.register_push_installation(
  p_installation_id uuid,
  p_token text,
  p_platform text default 'android'
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
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_installation_id is null then
    raise exception 'Missing installation id';
  end if;

  if length(v_token) < 20 or length(v_token) > 4096 then
    raise exception 'Invalid push token';
  end if;

  if v_platform not in ('android', 'ios') then
    raise exception 'Invalid platform';
  end if;

  -- Remove only a duplicate legacy/current row owned by the authenticated user.
  -- Never delete another user's token from this SECURITY DEFINER function.
  delete from public.push_tokens
  where token = v_token
    and user_id = v_user_id
    and installation_id is distinct from p_installation_id;

  insert into public.push_tokens (
    user_id,
    token,
    platform,
    installation_id,
    created_at,
    updated_at,
    last_seen_at
  )
  values (
    v_user_id,
    v_token,
    v_platform,
    p_installation_id,
    now(),
    now(),
    now()
  )
  on conflict (installation_id)
    where installation_id is not null
  do update set
    user_id = excluded.user_id,
    token = excluded.token,
    platform = excluded.platform,
    updated_at = now(),
    last_seen_at = now()
  returning id into v_id;

  return jsonb_build_object(
    'success', true,
    'id', v_id,
    'installation_id', p_installation_id
  );
end;
$$;

create or replace function public.unregister_push_installation(
  p_installation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_installation_id is null then
    return true;
  end if;

  delete from public.push_tokens
  where installation_id = p_installation_id
    and user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.register_push_installation(uuid, text, text) from public;
revoke all on function public.register_push_installation(uuid, text, text) from anon;
grant execute on function public.register_push_installation(uuid, text, text) to authenticated;
grant execute on function public.register_push_installation(uuid, text, text) to service_role;

revoke all on function public.unregister_push_installation(uuid) from public;
revoke all on function public.unregister_push_installation(uuid) from anon;
grant execute on function public.unregister_push_installation(uuid) to authenticated;
grant execute on function public.unregister_push_installation(uuid) to service_role;

-- Compatibility phase for old Android builds: direct table access remains temporarily,
-- but policies are restricted explicitly to authenticated users.
drop policy if exists "Users can delete own push tokens" on public.push_tokens;
drop policy if exists "Users can insert own push tokens" on public.push_tokens;
drop policy if exists "Users can update own push tokens" on public.push_tokens;
drop policy if exists "Users can view own push tokens" on public.push_tokens;

create policy "Users can delete own push tokens"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own push tokens"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can view own push tokens"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

commit;
