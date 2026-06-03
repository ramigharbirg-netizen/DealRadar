import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { getStoredConsent, saveConsent, DEFAULT_CONSENT } from '../lib/privacy';
import { toast } from 'sonner';

export const PrivacySettings = () => {
  const { user } = useAuth();
  const [consent, setConsent] = useState(DEFAULT_CONSENT);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setConsent(getStoredConsent() || DEFAULT_CONSENT);
  }, []);

  const handleSave = async () => {
    try {
      await saveConsent({ consent, user });
      toast.success('Preferenze privacy salvate');
    } catch (err) {
      console.error('Save privacy preferences error:', err);
      toast.error('Impossibile salvare le preferenze privacy');
    }
  };

  const exportData = async () => {
    if (!user) {
      toast.error('Devi accedere per esportare i dati');
      return;
    }

    if (exporting) return;

    const confirmed = window.confirm(
  'Esportare tutti i dati associati al tuo account DealRadar?\n\n' +
  'Il file includerà:\n' +
  '• Dati profilo\n' +
  '• Opportunità pubblicate\n' +
  '• Commenti\n' +
  '• Messaggi e chat\n' +
  '• Richieste di ritiro\n' +
  '• Consensi privacy\n\n' +
  'Procedere con il download?'
);

if (!confirmed) return;

    try {
      setExporting(true);

      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      const token = localStorage.getItem('token');

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configurazione Supabase mancante');
      }

      if (!token) {
        throw new Error('Sessione non valida. Effettua di nuovo il login.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/export-user-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Esportazione dati non riuscita');
      }

      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: 'application/json',
      });

      const today = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `dealradar-export-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      toast.success('Export dati completato');
    } catch (err) {
      console.error('Export user data error:', err);
      toast.error(err?.message || 'Impossibile esportare i dati');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gestione privacy</h1>
            <p className="text-sm text-gray-500">
              Modifica i consensi privacy ed esporta una copia dei tuoi dati.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
          <PrivacyRow title="Necessari" description="Sempre attivi." checked disabled />

          <PrivacyRow
            title="Analytics"
            description="Statistiche d’uso per migliorare l’app."
            checked={consent.analytics}
            onChange={(value) =>
              setConsent((prev) => ({ ...prev, analytics: value }))
            }
          />

          <PrivacyRow
            title="Marketing"
            description="Comunicazioni promozionali."
            checked={consent.marketing}
            onChange={(value) =>
              setConsent((prev) => ({ ...prev, marketing: value }))
            }
          />

          <PrivacyRow
            title="Geolocalizzazione"
            description="Mostrare opportunità vicino a te."
            checked={consent.geolocation}
            onChange={(value) =>
              setConsent((prev) => ({ ...prev, geolocation: value }))
            }
          />

          <Button className="w-full" onClick={handleSave}>
            Salva preferenze
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">Export dati GDPR</h2>

          <p className="mb-4 text-sm text-gray-500">
            Scarica un file JSON con i dati collegati al tuo account DealRadar,
            inclusi profilo, opportunità, commenti, preferiti, messaggi e consensi.
          </p>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportData}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exporting ? 'Esportazione in corso...' : 'Esporta i miei dati'}
          </Button>
          <p className="mt-3 text-xs text-amber-700">
  ⚠️ Il file esportato può contenere dati personali, messaggi, email e cronologia
  delle attività. Conservalo in modo sicuro e non condividerlo con terzi.
</p>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Per eliminare definitivamente il tuo account vai in{' '}
            <span className="font-semibold">Profilo → Elimina account</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

const PrivacyRow = ({ title, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
    <div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

export default PrivacySettings;