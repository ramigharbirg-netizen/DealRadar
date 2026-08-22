-- READ ONLY - DealRadar Security Hardening Phase 1 preflight

-- 1) Required functions exist with the expected signatures.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as configuration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_counterfeit_risk_report',
    'handle_new_user_profile',
    'notify_chat_message_push',
    'schedule_opportunity_expiry_notifications',
    'update_conversation_last_message',
    'update_opportunity_reports',
    'update_my_display_name',
    'renew_my_opportunity',
    'delete_my_opportunity'
  )
order by p.proname;

-- 2) Client roles must not be able to CREATE in schemas used by these functions.
select
  role_name,
  has_schema_privilege(role_name, 'public', 'USAGE') as public_usage,
  has_schema_privilege(role_name, 'public', 'CREATE') as public_create,
  has_schema_privilege(role_name, 'extensions', 'USAGE') as extensions_usage,
  has_schema_privilege(role_name, 'extensions', 'CREATE') as extensions_create
from (values ('anon'), ('authenticated'), ('service_role')) as r(role_name)
order by role_name;
