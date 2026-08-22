# DealRadar — Account Deletion Hardening

Purpose: make account erasure deterministic, fail-closed, compatible with the current live schema, and more aligned with data minimization.

## What was wrong in the previous function

- `opportunities.user_id` is NOT NULL, but the function attempted to set it to NULL.
- most database cleanup calls did not inspect returned errors, so a partial cleanup could be followed by a false success response.
- newer tables/columns such as UUID-based `pickup_requests` and `push_tokens` were not fully handled.
- requester conversations could retain the deleted UUID because `conversations.requester_id` is NOT NULL and has no FK to auth.users.
- avatar cleanup was not part of the deletion path.

## Hardened behavior

- validates the caller Bearer token before privileged operations;
- removes private operational data explicitly and checks every mandatory error;
- removes requester conversations (message/read rows cascade);
- minimizes any remaining authored message content;
- deletes owned opportunities rather than nulling `user_id`;
- relies on the existing opportunity delete trigger to queue image URLs for Storage purge;
- deletes profile/reputation/app-event/consent data;
- removes the avatar using the Supabase Storage API;
- deletes the Auth user only after mandatory cleanup succeeds;
- records only a non-identifying completed deletion audit;
- never test this first with the admin account: use a disposable TEST account.

## Deployment/test sequence

1. Run `20260822_account_deletion_preflight.sql` (read-only).
2. Copy the hardened `delete-account/index.ts` into the project.
3. Build/test locally as applicable.
4. Deploy: `npx supabase functions deploy delete-account`.
5. Create/use a disposable TEST account and add representative data (favorite, comment, pickup request, conversation/message, avatar, opportunity if practical).
6. Delete that TEST account from the normal DealRadar UI.
7. Run `20260822_account_deletion_postcheck.sql` after replacing `<TEST_USER_UUID>`.
8. Confirm queued opportunity images are later removed by the lifecycle worker if the TEST account owned an opportunity.
9. Only after all checks pass, commit/push.

## Scope note

CORS remains `*` in this patch on purpose. Origin policy will be handled consistently across all Edge Functions in the separate Edge Functions/CORS hardening block rather than changed piecemeal here.
