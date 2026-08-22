# DealRadar Push Token Lifecycle & Cost Hardening — Hotfix

Correzioni rispetto al primo pacchetto:
1. `register_push_installation` non può più eliminare righe appartenenti ad altri utenti.
2. `registerPushNotifications` esce immediatamente quando la stessa sessione utente ha già inizializzato le push.
3. Se cambia utente nella stessa vita dell'app, viene richiesta una nuova registrazione FCM per associare il token alla nuova identità.
4. Il preflight non fa riferimento a colonne che ancora non esistono.
5. Nessun cleanup aggressivo dei 22 token legacy: la migrazione resta compatibile con client Android precedenti.

Il file AuthContext.js NON è incluso nell'hotfix: conservare la modifica chirurgica già applicata manualmente.
