# DealRadar — Final Gate Push Installation Ownership Hardening

`register_push_installation()` previously allowed an existing `installation_id`
conflict to update `user_id` inside a SECURITY DEFINER function.

This patch:
- preserves authenticated-only execution;
- preserves same-user legacy token adoption;
- never changes ownership on conflict;
- lets the same owner refresh token/platform/timestamps;
- rejects an installation_id already owned by another user;
- keeps the ownership check atomic through the unique-index upsert.

Observed before patch: 8 rows total, 7 legacy rows with null installation_id,
1 distinct non-null installation_id.
