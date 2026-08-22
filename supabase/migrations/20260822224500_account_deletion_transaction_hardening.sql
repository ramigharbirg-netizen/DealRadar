begin;

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_avatar_url text;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  select up.avatar_url
    into v_avatar_url
  from public.user_profiles up
  where up.user_id = p_user_id;

  -- Private / user-specific operational data.
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.favorites where user_id = p_user_id;
  delete from public.opportunity_confirmations where user_id = p_user_id;
  delete from public.comments where user_id = p_user_id;
  delete from public.reports where reporter_id = p_user_id;
  delete from public.conversation_reads where user_id = p_user_id;
  delete from public.pickup_requests where requester_id = p_user_id or owner_id = p_user_id;
  delete from public.admin_roles where user_id = p_user_id;

  -- Conversations initiated by the deleting user are removed completely.
  -- Messages and reads cascade through conversation_id.
  delete from public.conversations where requester_id = p_user_id;

  -- Minimize any authored messages that remain in conversations not removed above.
  update public.conversation_messages
  set
    sender_name = 'Utente eliminato',
    sender_email = null,
    message = 'Messaggio rimosso',
    sender_id = null
  where sender_id = p_user_id;

  -- Defensive minimization for any anomalous owner references not tied to an owned opportunity.
  update public.conversations
  set owner_id = null
  where owner_id = p_user_id;

  update public.conversations
  set last_message_sender_id = null
  where last_message_sender_id = p_user_id;

  -- Delete owned opportunities. Existing triggers/FKs queue image purge and cascade dependents.
  delete from public.opportunities where user_id = p_user_id;

  delete from public.reputation_events where user_id = p_user_id;
  delete from public.app_events where user_id = p_user_id;

  -- Personal consent/request records are removed; a non-identifying completion audit is added later.
  delete from public.privacy_consents where user_id = p_user_id;
  delete from public.privacy_requests where user_id = p_user_id;

  -- Last public profile state. Any remaining FK-cascaded profile dependents are handled here.
  delete from public.user_profiles where user_id = p_user_id;

  return jsonb_build_object(
    'prepared', true,
    'avatar_url', v_avatar_url
  );
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public;
revoke all on function public.prepare_account_deletion(uuid) from anon;
revoke all on function public.prepare_account_deletion(uuid) from authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

commit;
