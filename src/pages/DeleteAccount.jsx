export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-[#FFE6C7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm md:p-10">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-600">
            DealRadar
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Eliminazione Account DealRadar
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-700">
            Gli utenti di DealRadar possono eliminare il proprio account
            direttamente dall'app in qualsiasi momento.
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Come eliminare il proprio account
          </h2>

          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">
            <li>Accedi all'app DealRadar.</li>
            <li>Apri la sezione Profilo.</li>
            <li>Premi il pulsante "Elimina Account".</li>
            <li>Conferma l'operazione.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">
            Quali dati vengono eliminati
          </h2>

          <p className="mt-4 leading-7 text-slate-700">
            Quando un utente elimina il proprio account, DealRadar elimina
            definitivamente i dati associati all'account, inclusi:
          </p>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            <li>Account utente e profilo pubblico.</li>
            <li>Indirizzo email associato all'account.</li>
            <li>Avatar e immagini del profilo.</li>
            <li>Opportunità pubblicate dall'utente.</li>
            <li>Immagini associate alle opportunità pubblicate.</li>
            <li>Commenti pubblicati.</li>
            <li>Messaggi delle chat.</li>
            <li>Preferiti salvati.</li>
            <li>Richieste di ritiro.</li>
            <li>Segnalazioni inviate.</li>
            <li>Consensi privacy registrati.</li>
            <li>Conferme opportunità e altri dati collegati all'account.</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-slate-700">
            <p>
              Una volta completata la procedura, l'account e i dati associati
              non possono essere ripristinati.
            </p>

            <p className="mt-3">
              Eventuali informazioni tecniche residue presenti nei sistemi di
              backup vengono sovrascritte secondo le normali procedure operative
              del fornitore dell'infrastruttura.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">
            Assistenza
          </h2>

          <p className="mt-4 leading-7 text-slate-700">
            Per qualsiasi richiesta relativa alla cancellazione dell'account
            puoi contattarci all'indirizzo:
          </p>

          <a
            href="mailto:dealradar.app@gmail.com"
            className="mt-3 inline-flex font-semibold text-orange-600 hover:text-orange-700"
          >
            dealradar.app@gmail.com
          </a>
        </section>
      </div>
    </div>
  );
}