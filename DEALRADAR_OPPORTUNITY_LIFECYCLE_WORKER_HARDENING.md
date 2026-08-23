# DealRadar — Opportunity Lifecycle Worker Concurrency & Cost Hardening

Obiettivi:
- evitare doppie notifiche o doppio processing Storage in caso di worker concorrenti;
- usare claim atomici con `FOR UPDATE SKIP LOCKED`;
- introdurre lease recuperabile di 10 minuti per job `processing`;
- mantenere compatibilità con i cron esistenti;
- rimuovere CORS wildcard dalla Edge Function internal-only;
- eliminare token push automaticamente solo su `UNREGISTERED`;
- ridurre i nuovi `last_error` a massimo 500 caratteri;
- controllare errori di cleanup token.

Trade-off:
lo stato `processing` aumenta leggermente la complessità del DB, ma la lease evita job bloccati per sempre: se un worker muore, dopo 10 minuti il job può essere reclamato.

Ordine:
1. preflight;
2. migration;
3. script PowerShell dalla root;
4. `deno check`;
5. deploy;
6. postcheck + test reale;
7. commit/push.
