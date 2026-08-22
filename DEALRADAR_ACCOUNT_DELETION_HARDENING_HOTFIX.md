# DealRadar — Account Deletion Hardening Hotfix

This hotfix replaces the first draft before deployment.

## Why

The first draft checked errors but still performed many independent PostgREST delete/update calls. That is fail-closed at the HTTP response level, but it is not an atomic database cleanup: a later failure could leave an account partially erased.

## Stronger design

- Avatar is removed first through Storage API. If this fails, database cleanup has not begun.
- Database erasure is centralized in `public.prepare_account_deletion(uuid)`, a `SECURITY DEFINER` RPC callable only by `service_role`.
- One RPC invocation executes the database cleanup inside PostgreSQL transaction semantics.
- Owned opportunities are deleted (never `user_id = NULL`), preserving lifecycle purge queue behavior.
- Requester conversations are deleted; remaining authored messages/owner references are minimized.
- Auth user deletion happens only after database preparation succeeds.
- If Auth deletion fails, the endpoint returns an error and the cleanup path is idempotent/retryable.
- A non-identifying completion audit is written only after Auth deletion.

Cross-system erasure (Storage + Postgres + Auth) cannot be one ACID transaction, so retryability and ordering are used to minimize partial-failure risk.

CORS remains unchanged in this hotfix and will be handled consistently in the dedicated Edge Functions/CORS hardening phase.

Never test first with the DealRadar admin account. Use a disposable TEST account.
