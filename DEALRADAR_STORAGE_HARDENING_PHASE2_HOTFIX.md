# Phase 2A pre-commit correction

This hotfix corrects only the local repository representation of Storage Hardening Phase 2A after live verification showed that `storage.objects` table grants are managed by `supabase_storage_admin`.

It overwrites:
- `supabase/migrations/20260822163000_storage_hardening_phase2.sql`
- `supabase/manual_checks/20260822_storage_hardening_phase2_postcheck.sql`
- `DEALRADAR_STORAGE_HARDENING_PHASE2.md`

No additional database migration is required for this correction: the effective live changes that Phase 2A intentionally retains are the canonical Storage RLS policies already applied successfully.
