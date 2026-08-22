# DealRadar Storage Orphan Cleanup Hotfix

Fix mirato per `SubmitOpportunity.jsx`.

## Problema verificato

Il cleanup degli upload temporanei era affidato principalmente al cleanup di `useEffect` durante l'unmount. Nei test reali due immagini caricate durante wizard non pubblicati sono rimaste in `opportunity-images` senza essere referenziate da alcuna opportunita.

## Correzione

- aggiunge un cleanup esplicito e `await` prima di `onExit`;
- la navigazione viene bloccata se la rimozione Storage fallisce, evitando di lasciare consapevolmente un file orfano;
- il cleanup all'unmount rimane come seconda rete di sicurezza;
- dopo una pubblicazione riuscita, `submittedRef` continua a impedire la cancellazione delle immagini dell'annuncio;
- dopo un cleanup riuscito i path vengono rimossi dal Set locale per evitare doppie cancellazioni.

## Backend

Nessuna migration o modifica Supabase richiesta.
