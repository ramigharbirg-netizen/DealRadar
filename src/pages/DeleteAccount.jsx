export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Eliminazione Account DealRadar
        </h1>

        <p className="mb-6">
          Gli utenti di DealRadar possono eliminare il proprio account
          direttamente dall'app.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">
          Come eliminare il proprio account
        </h2>

        <ol className="list-decimal pl-6 space-y-2">
          <li>Accedi all'app DealRadar.</li>
          <li>Apri la sezione Profilo.</li>
          <li>Premi il pulsante "Elimina Account".</li>
          <li>Conferma l'operazione.</li>
        </ol>

        <h2 className="text-2xl font-semibold mt-8 mb-4">
          Quali dati vengono eliminati
        </h2>

        <ul className="list-disc pl-6 space-y-2">
          <li>Profilo utente.</li>
          <li>Dati associati all'account.</li>
          <li>Consensi privacy associati all'utente.</li>
        </ul>

        <p className="mt-6">
          Alcuni dati potrebbero essere conservati temporaneamente per
          motivi tecnici, di sicurezza o per obblighi di legge, se
          applicabili.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">
          Assistenza
        </h2>

        <p>
          Per qualsiasi richiesta relativa alla cancellazione dell'account
          puoi contattarci all'indirizzo:
        </p>

        <p className="font-semibold mt-2">
          dealradar.app@gmail.com
        </p>
      </div>
    </div>
  );
}