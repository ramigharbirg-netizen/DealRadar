# DealRadar Storage Hardening Phase 2A

Scope: browser-side image validation/sanitization and RLS-policy hardening for Supabase Storage.

## Frontend
- Avatar upload accepts only JPEG/PNG/WEBP after extension, MIME and magic-byte validation.
- Avatar source size is bounded client-side and stored output must remain within the 2 MB bucket limit.
- Avatar images are re-encoded through canvas before upload to reduce retained source metadata.
- Opportunity images always validate file signatures, even when MIME and extension look valid.
- Opportunity images are re-encoded through canvas while preserving an appropriate JPEG/PNG/WEBP output format; upload is rejected if sanitization fails instead of falling back to the original file.
- Stored opportunity images remain capped at 2 MB and `upsert:false` remains unchanged.

## Database / Storage
- Duplicate opportunity-image DELETE/SELECT policies are replaced with one canonical owner-scoped policy for each operation.
- Browser ownership remains enforced through `auth.uid()` and the first Storage path segment for `opportunity-images`.
- Existing bucket MIME allowlists and 2 MB server-side limits remain in force.

## Supabase-managed privileges
`storage.objects` is part of Supabase Storage's managed schema. The effective table grants for `anon`, `authenticated` and `service_role` are granted by `supabase_storage_admin` and are not treated as application-owned privileges to override in DealRadar migrations.

DealRadar therefore relies on the supported Supabase control plane for browser authorization:
- bucket configuration;
- RLS policies on `storage.objects`;
- authenticated path ownership;
- service-role access only in trusted backend code.

The earlier Phase 2 draft attempted `REVOKE` operations on `storage.objects`. Live verification showed that these managed grants remain present, so the repository migration is corrected to avoid documenting or relying on an ineffective/unsupported privilege override.

## Deliberately unchanged
- `avatars` and `opportunity-images` remain public buckets. DealRadar currently stores public URLs in application data and renders them directly. Converting `opportunity-images` to a private bucket requires a separate signed-URL architecture and lifecycle/privacy design review.
- Public bucket reads by possession of the public URL are therefore an explicit architectural property to be reassessed during the privacy/retention review.

## Required regression tests
1. Avatar JPEG/PNG/WEBP upload.
2. Reject unsupported/spoofed avatar file.
3. Publish opportunity with JPEG/PNG/WEBP image.
4. Remove uploaded opportunity image before submit.
5. Abandon wizard after upload and verify orphan cleanup.
6. Publish then delete an opportunity with an image and confirm lifecycle purge still completes.
7. Confirm canonical Storage policies remain exactly one SELECT and one DELETE policy for owner-scoped opportunity-image object access.
