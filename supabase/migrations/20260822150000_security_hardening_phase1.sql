-- DealRadar Security Hardening - Phase 1
-- Scope: least-privilege grants + SECURITY DEFINER hygiene.
-- This migration intentionally does NOT yet narrow normal SELECT/INSERT/UPDATE/DELETE
-- grants that may be used by the app. It removes only privileges verified as
-- unnecessary for client roles and locks down internal trigger functions.

begin;

-- ---------------------------------------------------------------------------
-- 1) SECURITY DEFINER search_path hardening
-- ---------------------------------------------------------------------------
-- All referenced relations remain schema-qualified in the function bodies.

alter function public.handle_new_user_profile()
  set search_path = pg_catalog, public;

alter function public.update_conversation_last_message()
  set search_path = pg_catalog, public;

alter function public.create_counterfeit_risk_report(uuid, jsonb)
  set search_path = pg_catalog, public;

alter function public.notify_chat_message_push()
  set search_path = pg_catalog, public, extensions, vault;

-- ---------------------------------------------------------------------------
-- 2) RPC / trigger-function EXECUTE least privilege
-- ---------------------------------------------------------------------------
-- Trigger functions do not need to be directly callable by browser/mobile roles.
-- PostgreSQL triggers continue to execute them through the registered trigger.

revoke execute on function public.handle_new_user_profile()
  from public, anon, authenticated;

revoke execute on function public.notify_chat_message_push()
  from public, anon, authenticated;

revoke execute on function public.schedule_opportunity_expiry_notifications()
  from public, anon, authenticated;

revoke execute on function public.update_conversation_last_message()
  from public, anon, authenticated;

revoke execute on function public.update_opportunity_reports()
  from public, anon, authenticated;

-- Internal backend/service operations remain available to the service role.
grant execute on function public.handle_new_user_profile() to service_role;
grant execute on function public.notify_chat_message_push() to service_role;
grant execute on function public.schedule_opportunity_expiry_notifications() to service_role;
grant execute on function public.update_conversation_last_message() to service_role;
grant execute on function public.update_opportunity_reports() to service_role;

-- Anti-counterfeit RPC is a client-facing authenticated action. Anonymous callers
-- must not invoke it; authenticated users are still constrained inside the RPC by
-- auth.uid() ownership checks.
revoke execute on function public.create_counterfeit_risk_report(uuid, jsonb)
  from public, anon;
grant execute on function public.create_counterfeit_risk_report(uuid, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Remove client DDL-oriented privileges from application tables
-- ---------------------------------------------------------------------------
-- The browser/mobile app never needs TRUNCATE, TRIGGER, or REFERENCES.
-- RLS is not a substitute for avoiding these grants.

revoke truncate, trigger, references on table
  public.admin_roles,
  public.app_events,
  public.comments,
  public.conversation_messages,
  public.conversation_reads,
  public.conversations,
  public.favorites,
  public.opportunities,
  public.opportunity_confirmations,
  public.pickup_requests,
  public.privacy_consents,
  public.privacy_requests,
  public.push_notification_logs,
  public.push_tokens,
  public.reports,
  public.user_profiles
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Explicitly preserve the intended client RPC surface
-- ---------------------------------------------------------------------------
-- These grants are restated so the migration documents the supported browser/
-- mobile callable operations after the hardening above.

grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.renew_my_opportunity(uuid) to authenticated;
grant execute on function public.delete_my_opportunity(uuid) to authenticated;

commit;
