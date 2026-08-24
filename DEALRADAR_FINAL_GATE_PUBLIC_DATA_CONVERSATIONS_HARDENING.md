# DealRadar — Final Gate Public Data & Conversations Hardening

Closes four confirmed issues:
- `public_user_profiles` remains publicly readable, while client INSERT/UPDATE/DELETE privileges are revoked; SELECT remains public.
- Public comment reads require the linked opportunity to be active, unexpired and not hidden, except an authenticated author can still read their own comment.
- Public confirmation reads follow the same visibility rule, except an authenticated verifier can still read their own confirmation.
- Clients lose UPDATE policy/grant on `conversations`; current frontend only SELECTs/INSERTs, while SECURITY DEFINER server functions keep maintaining `last_message*` and deletion fields.

No anti-counterfeit opportunity fields are changed because current frontend flows legitimately calculate and submit them.
