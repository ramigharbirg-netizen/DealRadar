# DealRadar Pickup Requests Security Hardening

## Why
The legacy `pickup_requests` flow trusted client-supplied requester identity, email, owner name and `status`, while its INSERT RLS policy used `WITH CHECK (true)`. Authorization also relied on mutable email values.

## Security model
- `requester_id` is authoritative and derived from `auth.uid()`.
- `owner_id` is derived from `opportunities.user_id`.
- Names are server-derived.
- New pickup rows never duplicate account email addresses.
- `status` is forced to `pending`.
- Hidden/expired/self-owned opportunities are rejected.
- Duplicate requester/opportunity pairs are idempotent.
- The new frontend calls `create_pickup_request(uuid)` rather than direct INSERT.
- Historical duplicates are reduced to the oldest request.
- GDPR export uses UUIDs rather than email matching.

## Safe deployment order
1. Run `20260822_pickup_requests_security_preflight.sql`.
2. Apply `20260822211500_pickup_requests_security_hardening.sql`.
   - This migration remains compatible with the old frontend because a BEFORE INSERT trigger securely normalizes legacy direct inserts.
3. Deploy the updated `export-user-data` Edge Function.
4. Build and regression-test the updated frontend (`OpportunityDetail.jsx`).
5. Push/deploy the frontend and verify pickup request + conversation behavior.
6. Apply `20260822213000_pickup_requests_lockdown_and_minimization.sql`.
   - Direct client INSERT/UPDATE/DELETE is revoked.
   - Historical duplicated email data is nulled.
7. Run the lockdown post-check.

## Privacy
The second migration removes historical requester/owner email copies after all consumers have moved to UUID authorization. This reduces duplicated personal data while preserving the historical request itself.
