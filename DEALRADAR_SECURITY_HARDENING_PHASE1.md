# DealRadar Security Hardening - Phase 1

## Scope

This package contains the first least-privilege hardening migration derived from the LIVE Supabase audit performed on 2026-08-22.

It intentionally targets only changes already supported by evidence from the LIVE database and current DealRadar code:

- removes `TRUNCATE`, `TRIGGER`, and `REFERENCES` from `anon` and `authenticated` on legacy application tables;
- removes direct client `EXECUTE` access to internal trigger functions;
- keeps `create_counterfeit_risk_report(uuid,jsonb)` callable by authenticated users only, because the current frontend uses it after publication;
- fixes `search_path` on SECURITY DEFINER functions that were missing it or used a weaker value;
- explicitly preserves the three authenticated RPCs used by the current frontend: display-name update, renew opportunity, delete opportunity.

## Deliberately NOT changed yet

Normal `SELECT`, `INSERT`, `UPDATE`, and `DELETE` table grants are not broadly revoked in Phase 1. Some are still used directly by the current frontend, and reducing them safely requires the next access-matrix audit (table/column by table/column). RLS and existing server-side protection remain in force meanwhile.

This avoids a "security fix" that silently breaks production behavior.

## Apply order

1. Ensure current repository is clean and create a checkpoint/commit if needed.
2. Run the preflight SQL (read only).
3. Run the migration.
4. Run the post-check SQL (read only).
5. Regression-test: login/signup, profile load/avatar/name update, publish deal + counterfeit-risk path if available, chat send, report, renew/delete opportunity, lifecycle cron/worker.
6. Save the migration in `supabase/migrations/` and commit/push only after the regression tests pass.

## Expected post-check

- Every `anon_*`/`auth_*` value for TRUNCATE/TRIGGER/REFERENCES in the selected tables is `false`.
- Internal trigger functions show `anon_can_execute=false` and `authenticated_can_execute=false`.
- `create_counterfeit_risk_report` shows anon=false, authenticated=true, service_role=true.
- `update_my_display_name`, `renew_my_opportunity`, and `delete_my_opportunity` remain executable by authenticated.

## Rollback concept

If an unexpected application regression appears before commit, the migration can be reversed by re-granting the removed privileges and EXECUTE rights. Do not perform rollback by guesswork: capture the post-migration symptom and restore only the permission actually required.
