import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { getStoredConsent, saveConsent, DEFAULT_CONSENT } from '../lib/privacy';

export const ConsentBanner = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consent, setConsent] = useState(DEFAULT_CONSENT);

  useEffect(() => {
    const saved = getStoredConsent();

    if (!saved) {
      setVisible(true);
    } else {
      setConsent(saved);
    }
  }, []);

  const handleSave = async (newConsent) => {
    await saveConsent({ consent: newConsent, user });
    setVisible(false);
  };

  const rejectOptional = () => {
    handleSave({
      necessary: true,
      analytics: false,
      marketing: false,
      geolocation: false,
    });
  };

  const acceptAll = () => {
    handleSave({
      necessary: true,
      analytics: true,
      marketing: true,
      geolocation: true,
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[99999] bg-white border-t border-gray-200 shadow-2xl p-4">
      <div className="mx-auto max-w-3xl">
        {!settingsOpen ? (
          <>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1">
                <h2 className="font-bold text-gray-900">La tua privacy su DealRadar</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Usiamo tecnologie necessarie per far funzionare l’app. Con il tuo consenso possiamo usare anche dati analytics, marketing e posizione per migliorare il servizio.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button variant="outline" onClick={rejectOptional}>
                    Rifiuta non necessari
                  </Button>
                  <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                    Personalizza
                  </Button>
                  <Button onClick={acceptAll}>
                    Accetta tutto
                  </Button>
                </div>
              </div>

              <button
                type="button"
                onClick={rejectOptional}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-bold text-gray-900">Preferenze privacy</h2>
            <p className="mt-1 text-sm text-gray-600">
              Puoi scegliere quali categorie autorizzare. I necessari sono sempre attivi perché servono al funzionamento dell’app.
            </p>

            <div className="mt-4 space-y-4">
              <ConsentRow
                title="Necessari"
                description="Login, sicurezza, salvataggio sessione e funzioni tecniche."
                checked
                disabled
              />

              <ConsentRow
                title="Analytics"
                description="Ci aiutano a capire quali funzioni vengono usate e migliorare DealRadar."
                checked={consent.analytics}
                onChange={(value) => setConsent((prev) => ({ ...prev, analytics: value }))}
              />

              <ConsentRow
                title="Marketing"
                description="Comunicazioni promozionali, campagne e offerte future."
                checked={consent.marketing}
                onChange={(value) => setConsent((prev) => ({ ...prev, marketing: value }))}
              />

              <ConsentRow
                title="Geolocalizzazione"
                description="Mostrare opportunità vicino a te e migliorare i risultati locali."
                checked={consent.geolocation}
                onChange={(value) => setConsent((prev) => ({ ...prev, geolocation: value }))}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Indietro
              </Button>
              <Button variant="outline" onClick={rejectOptional}>
                Rifiuta non necessari
              </Button>
              <Button onClick={() => handleSave(consent)}>
                Salva preferenze
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ConsentRow = ({ title, description, checked, onChange, disabled }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-3">
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
};

export default ConsentBanner;