create or replace function public.update_my_display_name(new_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_name text;

  v_profiles integer := 0;
  v_opportunities integer := 0;
  v_comments integer := 0;
  v_messages integer := 0;
  v_pickup_requesters integer := 0;
  v_pickup_owners integer := 0;
begin
  v_user_id := auth.uid();
  v_user_email := auth.email();

  v_name := trim(
    regexp_replace(
      coalesce(new_display_name, ''),
      '\s+',
      ' ',
      'g'
    )
  );

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
  set
    display_name = v_name,
    updated_at = now()
  where user_id = v_user_id;

  get diagnostics v_profiles = row_count;

  if v_profiles = 0 then
    raise exception 'Profilo utente non trovato';
  end if;

  update public.opportunities
  set user_name = v_name
  where user_id = v_user_id;

  get diagnostics v_opportunities = row_count;

  update public.comments
  set user_name = v_name
  where user_id = v_user_id;

  get diagnostics v_comments = row_count;

  update public.conversation_messages
  set sender_name = v_name
  where sender_id = v_user_id;

  get diagnostics v_messages = row_count;

  if v_user_email is not null then
    update public.pickup_requests
    set requester_name = v_name
    where requester_email = v_user_email;

    get diagnostics v_pickup_requesters = row_count;

    update public.pickup_requests
    set owner_name = v_name
    where owner_email = v_user_email;

    get diagnostics v_pickup_owners = row_count;
  end if;

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

revoke all
on function public.update_my_display_name(text)
from public;

revoke all
on function public.update_my_display_name(text)
from anon;

grant execute
on function public.update_my_display_name(text)
to authenticated;
