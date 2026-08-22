# DealRadar — Push Token Lifecycle & Cost Hardening

## Obiettivo
Ridurre registrazioni push duplicate, token FCM storici, invii FCM inutili e scritture log superflue senza rompere il supporto multi-device o le vecchie versioni Android già installate.

## Strategia a due fasi

### Fase A — compatibile con i client legacy
- aggiunge `installation_id` e `last_seen_at` a `public.push_tokens`;
- aggiunge RPC sicure `register_push_installation` e `unregister_push_installation`;
- il nuovo client usa un UUID casuale persistente per installazione;
- un cambio token FCM sulla stessa installazione aggiorna la stessa riga;
- il cambio account sulla stessa installazione riassegna la riga al nuovo utente;
- il logout rimuove l'associazione dell'installazione corrente prima del `signOut`;
- la registrazione Push viene deduplicata in memoria;
- le policy dirette restano temporaneamente per compatibilità con vecchie build Android.

### Fase B — lockdown/cleanup (NON applicare subito)
Dopo rollout e adozione della nuova versione Android:
- misurare l'adozione di `installation_id`;
- rimuovere i token legacy in modo controllato;
- valutare `UNIQUE(token)` globale;
- revocare accesso diretto client a `push_tokens` e usare solo RPC;
- introdurre retention per token non visti da molto tempo.

## Trade-off
Non cancelliamo subito i 22 token legacy perché non possiamo distinguere con certezza dispositivi diversi ancora validi. Una pulizia aggressiva potrebbe togliere notifiche a un secondo telefono legittimo.
