# DealRadar — Opportunity Lifecycle + Durable Reputation

## What this package implements

- **Deals (`content_type = deal`)**: user-selected expiry of 24h, 3d, 7d, 30d or a custom date (maximum 90 days).
- **Sales / jobs / real estate / free items**: 90-day lifecycle.
- **Reminders**: push reminders 7 and 3 days before expiry when the chosen duration actually allows them.
- **Expiry**: opportunity leaves feed/map/public discovery at `expires_at`.
- **Grace period**: owner can recover it for 30 days.
- **Purge**: after the grace period, DB content is physically deleted; Storage image deletion is queued and retried independently.
- **Durable reputation**: deletion of content does not subtract earned points/Trust Score.
- **Verification**: one authoritative threshold of 3 confirmations.
- **Security**: expired/hidden content is enforced at RLS, not only hidden in React.

## Important design decisions

1. Existing reputation is snapshotted exactly into `reputation_events` before switching models.
2. Future reputation is event-based and no longer recalculated from rows that still happen to exist.
3. Manual deletion uses `delete_my_opportunity()` so Storage cleanup is durable instead of best-effort client cleanup.
4. Account deletion removes the reputation ledger and resets the anonymized profile's reputation fields.
5. Existing Android clients remain compatible: DB defaults assign expiry even if they do not send `expires_at`.

## Files added / changed

### Backend
- `supabase/migrations/20260821213000_opportunity_lifecycle_and_reputation.sql`
- `supabase/functions/process-opportunity-lifecycle/index.ts`
- `supabase/functions/process-opportunity-lifecycle/deno.json`
- `supabase/functions/delete-account/index.ts`
- `supabase/config.toml`

### Frontend
- `src/utils/opportunityLifecycle.js`
- `src/components/opportunity-wizard/OpportunityWizard.jsx`
- `src/pages/SubmitOpportunity.jsx`
- `src/pages/EditOpportunity.jsx`
- `src/pages/Profile.jsx`
- `src/pages/FeedView.jsx`
- `src/pages/MapView.jsx`
- `src/pages/PublicProfile.jsx`
- `src/pages/Favorites.jsx`
- `src/components/OpportunityCard.jsx`
- `src/components/OpportunityDetail.jsx`
- `src/lib/pushNotifications.js`

## Safe deployment order

### 0. Create a Git checkpoint first

```powershell
git status
git add .
git commit -m "chore: checkpoint before opportunity lifecycle"
git push origin main
```

Only do this if the working tree contains changes you intentionally want to preserve.

### 1. Preflight — READ ONLY
Run:

`supabase/manual_checks/20260821_lifecycle_preflight.sql`

Expected:
- `pg_cron` appears in `pg_available_extensions`.
- `dealradar_internal_secret` exists in Vault.
- Record the aggregate reputation totals before migration.

### 2. Deploy the new Edge Function first

From project root:

```powershell
npx supabase functions deploy process-opportunity-lifecycle --no-verify-jwt
```

The function is protected by `x-dealradar-secret`, exactly like the existing chat notification function.
It reuses existing project secrets:
- `DEALRADAR_INTERNAL_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Apply the migration

Preferred tracked method:

```powershell
npx supabase db push
```

Before confirming, verify that the CLI plans to apply only the new migration expected for this checkpoint.

Alternative: copy the migration into SQL Editor and run it once. If SQL Editor is used, do **not** delete the migration file from Git; the repository remains the historical source of truth.

### 4. Run postcheck — READ ONLY
Run:

`supabase/manual_checks/20260821_lifecycle_postcheck.sql`

Required checks:
- every opportunity has `expires_at` and `lifecycle_status`;
- two Cron jobs exist and are active;
- every existing profile has a reputation ledger snapshot;
- old reputation trigger is gone;
- only `trg_sync_opportunity_verification` remains for verification counts.

### 5. Local frontend build

```powershell
npm run build
```

A successful build may still show the already-known `ChatsView.jsx` hook warnings. Any new ERROR must be fixed before deployment.

### 6. Functional test matrix before push

#### Deal creation
- 24h
- 3d
- 7d
- 30d
- custom valid date
- custom date <1 hour -> rejected
- custom date >90 days -> rejected

#### Standard content
- sale gets ~90 days
- job gets ~90 days
- real estate gets ~90 days
- free item gets ~90 days

#### Renewal
- standard active >7 days -> renewal rejected
- standard active <=7 days -> renews to ~90 days from now
- standard expired within grace -> renews
- expired deal -> Edit requires a new future expiry and reactivates

#### Public visibility
- active visible in Feed/Map/PublicProfile
- expired absent from Feed/Map/PublicProfile
- owner sees expired in Profile
- existing chat participant can still see context during grace

#### Reputation
Take one user's values before deleting a test opportunity. After delete, verify:
- points unchanged
- trust_score unchanged
- total_opportunities unchanged (lifetime)
- verified_deals unchanged

#### Verification
- owner cannot self-confirm
- 1 confirmation -> not verified
- 2 confirmations -> not verified
- 3 confirmations -> verified
- verification reward is credited only once, even if confirmations later fall below 3 and return to 3

#### Purge
Use a test opportunity with controlled timestamps in a non-production test if available. Verify dependent rows cascade and Storage queue reaches `completed`.

### 7. Commit / push / Android sync

After all tests pass:

```powershell
git status
git diff --stat
git add src supabase
git status
git commit -m "feat: add opportunity lifecycle and durable reputation"
git push origin main
npm run build
npx cap sync android
git status
```

## Emergency stop

If anything unexpected happens after migration, run only:

`supabase/manual_checks/20260821_lifecycle_emergency_stop.sql`

This stops both Cron jobs without deleting schema or data. It is intentionally safer than attempting an automatic destructive rollback after new reputation events may already exist.

## Validation already performed on this package

- Repository and LIVE schema were analyzed before implementation.
- All modified JS/JSX/TS files were parsed with the TypeScript parser: **0 syntax parse errors**.
- All relative frontend imports resolve to existing files.
- A full CRA production build still must be run on the real DealRadar workstation because this packaging environment does not contain the project's installed `node_modules`.
