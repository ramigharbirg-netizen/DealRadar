import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Radar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const PASSWORD_MIN_LENGTH = 6;

const isPasswordValid = (password) => {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
};

export const ResetPassword = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const prepareRecoverySession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          window.history.replaceState({}, document.title, '/reset-password');
          setSessionReady(true);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setSessionReady(true);
          return;
        }

        toast.error('Link di recupero non valido o scaduto');
        setSessionReady(false);
      } catch (err) {
        console.error('Prepare reset session error:', err);
        toast.error('Link di recupero non valido o scaduto');
        setSessionReady(false);
      } finally {
        setCheckingSession(false);
      }
    };

    prepareRecoverySession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sessionReady) {
      toast.error('Sessione di recupero non valida. Richiedi un nuovo link.');
      return;
    }

    if (!isPasswordValid(password)) {
      toast.error('La password deve avere almeno 6 caratteri, una maiuscola e un numero');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      await supabase.auth.signOut();

      toast.success('Password aggiornata correttamente');
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error(err?.message || 'Impossibile aggiornare la password');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="reset-password-page">
      <div className="flex-1 flex flex-col justify-center px-6 pb-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
            <Radar className="w-8 h-8 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Nuova password</h1>
          <p className="text-gray-500 mt-1">
            Scegli una nuova password per il tuo account DealRadar.
          </p>
        </div>

        {!sessionReady && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Link di recupero non valido o scaduto. Torna alla pagina login e richiedi un nuovo link.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="password">Nuova password</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crea una nuova password"
                className="h-12 rounded-xl pl-11 pr-12"
                required
                autoComplete="new-password"
                disabled={!sessionReady}
              />

              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

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

          <div>
            <Label htmlFor="confirmPassword">Conferma password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la nuova password"
              className="mt-1.5 h-12 rounded-xl"
              required
              autoComplete="new-password"
              disabled={!sessionReady}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary rounded-xl text-base font-semibold"
            disabled={loading || !sessionReady}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Aggiorna password'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;