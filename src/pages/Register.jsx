import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Radar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { saveConsent, PRIVACY_VERSION, TERMS_VERSION } from '../lib/privacy';

const PASSWORD_MIN_LENGTH = 6;

const isPasswordValid = (password) => {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
};

export const Register = () => {
  const { register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const turnstileSiteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

  const canSubmit =
  acceptedPrivacy &&
  acceptedTerms &&
  !!turnstileToken &&
  !loading &&
  !authLoading;

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
  if (!turnstileSiteKey) return;

  const renderTurnstile = () => {
    if (!window.turnstile || !turnstileRef.current) return;
    if (turnstileWidgetIdRef.current !== null) return;

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileRef.current,
      {
        sitekey: turnstileSiteKey,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      }
    );
  };

  const existingScript = document.querySelector(
    'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
  );

  if (existingScript) {
    existingScript.addEventListener('load', renderTurnstile);
    renderTurnstile();

    return () => {
      existingScript.removeEventListener('load', renderTurnstile);
    };
  }

  const script = document.createElement('script');
  script.src =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.addEventListener('load', renderTurnstile);

  document.body.appendChild(script);

  return () => {
    script.removeEventListener('load', renderTurnstile);
  };
}, [turnstileSiteKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;

    if (!name) {
      toast.error('Inserisci il tuo nome');
      return;
    }

    if (!email) {
      toast.error('Inserisci la tua email');
      return;
    }

    if (!isPasswordValid(password)) {
      toast.error('La password deve avere almeno 6 caratteri, una maiuscola e un numero');
      return;
    }

    if (!acceptedPrivacy || !acceptedTerms) {
      toast.error('Devi accettare Privacy Policy e Termini di Servizio');
      return;
    }

if (!turnstileToken) {
  toast.error('Completa la verifica di sicurezza');
  return;
}

    if (loading || authLoading) return;

    setLoading(true);

    try {
      const newUser = await register(name, email, password);

      const legalData = {
        acceptedPrivacy: true,
        acceptedTerms: true,
        marketingConsent: Boolean(marketingConsent),
        acceptedAt: new Date().toISOString(),
        privacyVersion: PRIVACY_VERSION,
        termsVersion: TERMS_VERSION,
      };

      localStorage.setItem('dealradar_registration_legal', JSON.stringify(legalData));

      await saveConsent({
        user: newUser || null,
        consent: {
          necessary: true,
          analytics: false,
          marketing: Boolean(marketingConsent),
          geolocation: false,
          legal: legalData,
        },
      });

      if (!newUser) {
        toast.success('Account creato. Controlla la tua email per confermare.');
      } else {
        toast.success('Account creato! Inizia a cercare occasioni! 🎯');
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Register error:', err);
      toast.error(err?.message || 'Registrazione non riuscita');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="register-page">
      <div className="p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => navigate('/')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
            <Radar className="w-8 h-8 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Entra in DealRadar</h1>
          <p className="text-gray-500 mt-1">Scopri opportunità vicino a te</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Mario Rossi"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="name-input"
              autoComplete="name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tua@email.com"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="email-input"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Crea una password"
                className="h-12 rounded-xl pr-12"
                required
                data-testid="password-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <p className="mt-1.5 text-xs text-gray-500">
              Usa almeno 6 caratteri, una lettera maiuscola e un numero.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">
              Privacy Policy e Termini sono obbligatori. Le comunicazioni promozionali sono facoltative.
            </p>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={acceptedPrivacy}
                onCheckedChange={(value) => setAcceptedPrivacy(Boolean(value))}
              />
              <span>
                Accetto la{' '}
                <Link to="/privacy-policy" className="font-semibold text-primary underline">
                  Privacy Policy
                </Link>{' '}
                di DealRadar. <span className="font-medium">(obbligatorio)</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(value) => setAcceptedTerms(Boolean(value))}
              />
              <span>
                Accetto i{' '}
                <Link to="/terms" className="font-semibold text-primary underline">
                  Termini e Condizioni
                </Link>{' '}
                di DealRadar. <span className="font-medium">(obbligatorio)</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={marketingConsent}
                onCheckedChange={(value) => setMarketingConsent(Boolean(value))}
              />
              <span>
                Acconsento a ricevere comunicazioni promozionali e aggiornamenti.
                <span className="ml-1 text-gray-500">Facoltativo.</span>
              </span>
            </label>
          </div>

<div className="flex justify-center">
  <div ref={turnstileRef} />
</div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary rounded-xl text-base font-semibold"
            disabled={!canSubmit}
            data-testid="register-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creazione account...
              </>
            ) : (
              'Crea account'
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Hai già un account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Accedi
          </Link>
        </p>

        <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm font-medium text-gray-700 mb-2">Perché entrare in DealRadar?</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Scopri occasioni vicino a te in tempo reale</li>
            <li>• Guadagna punti segnalando opportunità</li>
            <li>• Scala la classifica e ottieni badge</li>
            <li>• Ricevi notifiche sulle nuove opportunità</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;