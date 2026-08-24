# DealRadar — Save Consent Identity & Privacy Hardening

Obiettivi:
- mantenere il consenso anonimo pre-login;
- impedire spoofing di `user_id`;
- verificare il JWT server-side quando presente;
- JWT invalido -> 401, senza downgrade ad anonimo;
- rendere `privacy_consents` server-only;
- validare payload/sessione/versioni;
- minimizzare `preferences`, IP e user-agent;
- deduplicare richieste identiche entro 5 minuti;
- rate-limit prudente: massimo 20 aggiornamenti/ora per sessione;
- CORS allowlist DealRadar + localhost/Capacitor;
- rendere esplicito `verify_jwt=false` perché il consenso anonimo deve funzionare.

Ordine:
1. copia file;
2. controlla diff;
3. preflight;
4. migration;
5. applica `apply_save_consent_config_patch.ps1`;
6. `deno check`;
7. `npm run build`;
8. deploy: `npx supabase functions deploy save-consent --no-verify-jwt`;
9. test anonimo + autenticato + JWT invalido + GET 405;
10. postcheck;
11. commit/push.
