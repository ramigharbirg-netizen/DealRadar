# DealRadar — notify-chat-message Internal Hardening

- Registra in migration il REVOKE già applicato LIVE su `push_notification_logs`.
- Rimuove il CORS wildcard: l'endpoint è server-to-server e protetto da `DEALRADAR_INTERNAL_SECRET`.
- Mantiene `error_code` e `fcm_status`.
- Per errori FCM noti/ridondanti salva `error_message = null`.
- Per errori sconosciuti conserva solo una versione normalizzata e troncata a 200 caratteri.
- Mantiene la rimozione automatica dei token FCM invalidi.
- Controlla e logga eventuali errori nell'insert dei log e nel cleanup token.

Trade-off: togliere il CORS browser rende l'endpoint inadatto a chiamate frontend dirette; è intenzionale perché il codice auditato mostra che l'unico chiamante applicativo è il trigger PostgreSQL interno.
