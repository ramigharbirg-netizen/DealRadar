import React from 'react';
import { ChevronLeft, Mail, ShieldCheck, Bug, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const Support = () => {
  const navigate = useNavigate();

  const email = 'dealradarapp@gmail.com';

  const openEmail = (subject) => {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Supporto</h1>
            <p className="text-sm text-gray-500">Assistenza DealRadar</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-bold text-lg">Come possiamo aiutarti?</h2>
            <p className="text-sm text-gray-600">
              Per assistenza, problemi account, segnalazioni, bug o richieste privacy/GDPR puoi contattarci via email.
            </p>
            <p className="text-sm font-semibold">{email}</p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full h-12 justify-start rounded-xl"
          onClick={() => openEmail('Supporto DealRadar')}
        >
          <Mail className="w-4 h-4 mr-2" />
          Contatta assistenza
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 justify-start rounded-xl"
          onClick={() => openEmail('Segnalazione bug DealRadar')}
        >
          <Bug className="w-4 h-4 mr-2" />
          Segnala un bug
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 justify-start rounded-xl"
          onClick={() => openEmail('Richiesta privacy/GDPR DealRadar')}
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Richiesta privacy/GDPR
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 justify-start rounded-xl border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => openEmail('Segnalazione sicurezza DealRadar')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Segnalazione sicurezza
        </Button>
      </div>
    </div>
  );
};

export default Support;