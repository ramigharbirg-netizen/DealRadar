# DealRadar lifecycle — pre-run hardening hotfix

Apply this hotfix BEFORE running the lifecycle migration.

It hardens the migration in five areas discovered during the final pre-Run audit:

1. Existing users with zero historical opportunities receive the legacy 30-point Trust base correctly on their first future reputation-bearing action.
2. Existing verification achievements are seeded with zero-delta idempotency markers before normalizing the authoritative threshold to 3 confirmations, preventing accidental double rewards.
3. Existing verification counters/status are normalized to the single 3-confirmation rule without changing the captured reputation baseline.
4. Every physical opportunity DELETE, including legacy/direct deletes, is captured by a BEFORE DELETE purge trigger so Storage cleanup cannot be bypassed.
5. Comments and confirmation rows inherit lifecycle visibility from the opportunity instead of remaining globally readable after expiry.

The postcheck was also strengthened to verify reputation aggregate preservation, verification consistency, lifecycle triggers, Cron jobs, queues, and RLS policy names.
