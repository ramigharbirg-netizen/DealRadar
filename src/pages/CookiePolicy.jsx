import React from 'react';

export const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background p-5 pb-24">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-3xl font-bold">Cookie Policy</h1>

        <p>
          DealRadar utilizza cookie e tecnologie simili, come localStorage e strumenti tecnici dell’app, per fornire il servizio e migliorare l’esperienza utente.
        </p>

        <h2 className="text-xl font-bold">1. Tecnologie necessarie</h2>
        <p>
          Sono essenziali per login, sicurezza, preferenze privacy, sessione e corretto funzionamento dell’app. Non richiedono consenso.
        </p>

        <h2 className="text-xl font-bold">2. Analytics</h2>
        <p>
          Sono usati solo previo consenso per capire come viene usata l’app e migliorare funzioni, stabilità e performance.
        </p>

        <h2 className="text-xl font-bold">3. Marketing</h2>
        <p>
          Sono usati solo previo consenso per comunicazioni promozionali, campagne e funzioni future.
        </p>

        <h2 className="text-xl font-bold">4. Geolocalizzazione</h2>
        <p>
          La posizione viene usata solo se autorizzata dall’utente e serve a mostrare opportunità vicine.
        </p>

        <h2 className="text-xl font-bold">5. Gestione preferenze</h2>
        <p>
          L’utente può modificare o revocare le preferenze in qualsiasi momento dalla pagina “Gestione privacy”.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">Contatti e supporto</h2>

          <p>
            Per richieste privacy, cancellazione account, esportazione dati,
            segnalazioni o assistenza puoi contattarci a:
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

export default CookiePolicy;