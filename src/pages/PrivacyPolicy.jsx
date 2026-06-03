import React from 'react';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background p-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>

        <p>
          La presente informativa descrive come DealRadar tratta i dati
          personali degli utenti ai sensi del Regolamento UE 2016/679
          (“GDPR”).
        </p>

        <h2 className="text-xl font-bold">
          1. Titolare del trattamento
        </h2>

        <p>
          Il titolare del trattamento è Rami Gharbi. Email di contatto
          privacy: dealradarapp@gmail.com
        </p>

        <h2 className="text-xl font-bold">2. Dati trattati</h2>

        <p>
          DealRadar può trattare: nome, email, dati account, dati di
          geolocalizzazione se autorizzati, contenuti pubblicati
          dall’utente, immagini caricate, preferiti, commenti, messaggi,
          dati tecnici del dispositivo, log tecnici, consensi privacy e
          dati di utilizzo dell’app.
        </p>

        <h2 className="text-xl font-bold">
          3. Finalità e basi giuridiche
        </h2>

        <p>
          I dati sono trattati per: fornire il servizio, gestire account
          e sicurezza, mostrare opportunità vicine, consentire
          pubblicazione e consultazione contenuti, inviare notifiche,
          migliorare l’app tramite analytics se autorizzati, inviare
          comunicazioni marketing solo se autorizzate.
        </p>

        <p>
          Le basi giuridiche sono: esecuzione del servizio, consenso
          dell’utente, obblighi legali, legittimo interesse alla sicurezza
          e prevenzione abusi.
        </p>

        <h2 className="text-xl font-bold">4. Geolocalizzazione</h2>

        <p>
          La posizione viene utilizzata solo se l’utente concede il
          permesso dal dispositivo o inserisce volontariamente un
          indirizzo. L’utente può revocare il permesso dalle impostazioni
          del dispositivo o dall’app.
        </p>

        <h2 className="text-xl font-bold">
          5. Cookie e tecnologie simili
        </h2>

        <p>
          DealRadar usa tecnologie necessarie per il funzionamento.
          Analytics, marketing e geolocalizzazione sono attivati solo
          previo consenso. L’utente può modificare le preferenze in
          qualsiasi momento.
        </p>

        <h2 className="text-xl font-bold">6. Conservazione</h2>

        <p>
          I dati sono conservati per il tempo necessario alla fornitura
          del servizio, alla tutela dei diritti del titolare e al rispetto
          degli obblighi legali. I consensi sono conservati per prova
          dell’avvenuta scelta.
        </p>

        <h2 className="text-xl font-bold">
          7. Comunicazione a terzi
        </h2>

        <p>
          I dati possono essere trattati da fornitori tecnici necessari al
          servizio, come Supabase, hosting, servizi di autenticazione,
          mappe e strumenti tecnici. I dati non vengono venduti.
        </p>

        <h2 className="text-xl font-bold">
          8. Trasferimenti extra UE
        </h2>

        <p>
          Alcuni fornitori tecnici potrebbero trattare dati fuori dallo
          Spazio Economico Europeo. In tal caso saranno utilizzate
          garanzie adeguate previste dal GDPR.
        </p>

        <h2 className="text-xl font-bold">
          9. Diritti dell’utente
        </h2>

        <p>
          L’utente può chiedere accesso, rettifica, cancellazione,
          limitazione, portabilità, opposizione e revoca del consenso.
          Le richieste possono essere inviate a:
        </p>

        <p className="font-semibold">
          dealradarapp@gmail.com
        </p>

        <h2 className="text-xl font-bold">10. Minori</h2>

        <p>
          DealRadar non è destinata a minori di 18 anni. L’utente
          dichiara di avere l’età necessaria per utilizzare il servizio.
        </p>

        <h2 className="text-xl font-bold">11. Aggiornamenti</h2>

        <p>
          La presente informativa può essere aggiornata. In caso di
          modifiche rilevanti, l’utente sarà informato nell’app.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">
            Contatti e supporto
          </h2>

          <p>
            Per richieste privacy, cancellazione account,
            esportazione dati, segnalazioni o assistenza puoi
            contattarci a:
          </p>

          <p className="font-semibold">
            dealradarapp@gmail.com
          </p>
        </section>

        <p className="text-sm text-gray-500">
          Versione 1.0 - Data: [INSERISCI DATA]
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;