import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Users,
  Ban,
  Mail,
} from 'lucide-react';

const sections = [
  {
    icon: FileText,
    title: '1. Oggetto del servizio',
    text: `DealRadar è una piattaforma digitale che permette agli utenti di pubblicare, cercare e consultare opportunità commerciali locali, come liquidazioni, stock, attrezzature, attività in vendita, aste, occasioni gratuite e segnalazioni della community.`,
  },
  {
    icon: Users,
    title: '2. Responsabilità degli utenti',
    text: `Gli utenti sono responsabili delle informazioni, immagini, descrizioni, prezzi, contatti e contenuti pubblicati. Ogni contenuto deve essere veritiero, lecito, aggiornato e non ingannevole.`,
  },
  {
    icon: AlertTriangle,
    title: '3. DealRadar non è parte delle trattative',
    text: `DealRadar non vende direttamente i beni pubblicati, non partecipa alle trattative tra utenti e non garantisce autenticità, qualità, disponibilità, prezzo o legalità delle opportunità segnalate.`,
  },
  {
    icon: Ban,
    title: '4. Contenuti vietati',
    text: `È vietato pubblicare contenuti illegali, fraudolenti, offensivi, discriminatori, contraffatti, pericolosi, spam, materiale protetto da copyright senza autorizzazione o dati personali di terzi senza consenso.`,
  },
  {
    icon: ShieldCheck,
    title: '5. Moderazione e rimozione contenuti',
    text: `DealRadar può rimuovere contenuti, nascondere opportunità, limitare funzionalità o sospendere account in caso di violazione delle regole, segnalazioni ripetute o comportamenti sospetti.`,
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="border-b border-gray-100 bg-white px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" />
            DealRadar
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Termini di Servizio
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            Utilizzando DealRadar accetti i presenti Termini di Servizio. Ti
            invitiamo a leggerli con attenzione prima di pubblicare, cercare o
            contattare altri utenti tramite la piattaforma.
          </p>

          <p className="mt-3 text-xs text-gray-400">
            Ultimo aggiornamento: Maggio 2026
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />

            <div>
              <h2 className="font-bold text-amber-900">
                Avviso importante
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                DealRadar è una piattaforma di segnalazione e scoperta
                opportunità. Le trattative, verifiche, pagamenti, ritiri e
                accordi avvengono direttamente tra gli utenti.
              </p>
            </div>
          </div>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <section
              key={section.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  {section.title}
                </h2>
              </div>

              <p className="text-sm leading-relaxed text-gray-600">
                {section.text}
              </p>
            </section>
          );
        })}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            6. Regole di pubblicazione
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
            <li>
              Non pubblicare opportunità false, duplicate o fuorvianti.
            </li>

            <li>
              Non pubblicare beni o servizi vietati dalla legge.
            </li>

            <li>
              Non usare immagini, marchi o testi protetti senza autorizzazione.
            </li>

            <li>
              Non pubblicare numeri, indirizzi o dati personali di terzi senza
              consenso.
            </li>

            <li>
              Non utilizzare DealRadar per spam, truffe o attività fraudolente.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            7. Account, sospensione e limitazioni
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            DealRadar può limitare, sospendere o chiudere account che violano i
            presenti Termini, le Linee guida contenuti, la normativa applicabile
            o che generano rischi per altri utenti o per la piattaforma.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            8. Privacy e dati personali
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Il trattamento dei dati personali avviene secondo la Privacy Policy
            di DealRadar e nel rispetto della normativa europea applicabile,
            incluso il GDPR.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>

            <h2 className="text-lg font-bold text-gray-900">
              9. Contatti
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-gray-600">
            Per richieste legali, privacy, supporto o segnalazioni puoi
            contattarci a:
          </p>

          <p className="mt-2 font-semibold text-primary">
            dealradarapp@gmail.com
          </p>
        </section>

        <p className="px-1 text-xs leading-relaxed text-gray-400">
          Nota: questi Termini sono una base operativa iniziale. Prima del
          lancio pubblico è consigliabile farli revisionare da un professionista
          legale.
        </p>
      </main>
    </div>
  );
};

export default TermsOfService;