-- READ ONLY - DealRadar Security Hardening Phase 1 post-check

-- 1) Client roles must have no TRUNCATE/TRIGGER/REFERENCES on app tables.
select
  c.relname as table_name,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'TRUNCATE') as anon_truncate,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'TRUNCATE') as auth_truncate,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'TRIGGER') as anon_trigger,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'TRIGGER') as auth_trigger,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'REFERENCES') as anon_references,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'REFERENCES') as auth_references
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'admin_roles','app_events','comments','conversation_messages',
    'conversation_reads','conversations','favorites','opportunities',
    'opportunity_confirmations','pickup_requests','privacy_consents',
    'privacy_requests','push_notification_logs','push_tokens','reports','user_profiles'
  )
order by c.relname;

-- 2) Internal trigger functions must not be directly executable by client roles.
select
  p.proname as function_name,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user_profile',
    'notify_chat_message_push',
    'schedule_opportunity_expiry_notifications',
    'update_conversation_last_message',
    'update_opportunity_reports'
  )
order by p.proname;

-- 3) Counterfeit RPC: authenticated only (plus service role), never anonymous.
select
  p.proname as function_name,
  p.proconfig as configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_counterfeit_risk_report';

-- 4) Client-facing RPCs needed by the app remain callable by authenticated users.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('update_my_display_name','renew_my_opportunity','delete_my_opportunity')
order by p.proname;
