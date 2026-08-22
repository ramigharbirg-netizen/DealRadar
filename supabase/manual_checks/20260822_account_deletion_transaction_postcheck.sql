select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'prepare_account_deletion';

-- After deleting a disposable TEST account, replace the placeholder and run separately:
-- select
--   (select count(*) from auth.users where id = '<TEST_USER_UUID>'::uuid) as auth_users_left,
--   (select count(*) from public.user_profiles where user_id = '<TEST_USER_UUID>'::uuid) as profiles_left,
--   (select count(*) from public.push_tokens where user_id = '<TEST_USER_UUID>'::uuid) as push_tokens_left,
--   (select count(*) from public.pickup_requests where requester_id = '<TEST_USER_UUID>'::uuid or owner_id = '<TEST_USER_UUID>'::uuid) as pickup_requests_left,
--   (select count(*) from public.conversations where requester_id = '<TEST_USER_UUID>'::uuid or owner_id = '<TEST_USER_UUID>'::uuid) as conversation_refs_left,
--   (select count(*) from public.conversation_messages where sender_id = '<TEST_USER_UUID>'::uuid) as message_sender_refs_left,
--   (select count(*) from public.opportunities where user_id = '<TEST_USER_UUID>'::uuid) as opportunities_left,
--   (select count(*) from public.admin_roles where user_id = '<TEST_USER_UUID>'::uuid) as admin_roles_left;
