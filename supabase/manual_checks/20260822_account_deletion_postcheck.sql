-- Run ONLY with the UUID/email of a disposable TEST account after testing deletion.
-- Replace the placeholders before running.

-- Expected after successful deletion: auth_user=0, profile=0, push_tokens=0,
-- favorites=0, comments=0, confirmations=0, pickup_requests=0,
-- requester_conversations=0, owned_opportunities=0, reputation_events=0.

select
  (select count(*) from auth.users where id = '<TEST_USER_UUID>'::uuid) as auth_user,
  (select count(*) from public.user_profiles where user_id = '<TEST_USER_UUID>'::uuid) as profile,
  (select count(*) from public.push_tokens where user_id = '<TEST_USER_UUID>'::uuid) as push_tokens,
  (select count(*) from public.favorites where user_id = '<TEST_USER_UUID>'::uuid) as favorites,
  (select count(*) from public.comments where user_id = '<TEST_USER_UUID>'::uuid) as comments,
  (select count(*) from public.opportunity_confirmations where user_id = '<TEST_USER_UUID>'::uuid) as confirmations,
  (select count(*) from public.pickup_requests where requester_id = '<TEST_USER_UUID>'::uuid or owner_id = '<TEST_USER_UUID>'::uuid) as pickup_requests,
  (select count(*) from public.conversations where requester_id = '<TEST_USER_UUID>'::uuid or owner_id = '<TEST_USER_UUID>'::uuid) as conversations_with_uuid,
  (select count(*) from public.opportunities where user_id = '<TEST_USER_UUID>'::uuid) as owned_opportunities,
  (select count(*) from public.reputation_events where user_id = '<TEST_USER_UUID>'::uuid) as reputation_events,
  (select count(*) from public.app_events where user_id = '<TEST_USER_UUID>'::uuid) as app_events,
  (select count(*) from public.privacy_consents where user_id = '<TEST_USER_UUID>'::uuid) as privacy_consents,
  (select count(*) from public.privacy_requests where user_id = '<TEST_USER_UUID>'::uuid) as linked_privacy_requests;

select
  count(*) as residual_messages_with_sender_id
from public.conversation_messages
where sender_id = '<TEST_USER_UUID>'::uuid;

select
  count(*) as completed_nonidentifying_deletion_audits
from public.privacy_requests
where request_type = 'delete_account'
  and status = 'completed'
  and user_id is null
  and email is null;
