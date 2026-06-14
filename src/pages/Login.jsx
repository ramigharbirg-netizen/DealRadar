import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Radar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const Login = () => {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGoogleLogin = async () => {
  if (googleLoading || loading || authLoading) return;

  setGoogleLoading(true);

  const redirectUrl = `${window.location.origin}/`;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) throw error;
  } catch (err) {
    console.error('Google login error:', err);
    toast.error(err?.message || 'Accesso con Google non riuscito');
    setGoogleLoading(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password.trim()) {
      toast.error('Inserisci email e password');
      return;
    }

    if (loading || googleLoading || authLoading) return;

    setLoading(true);

    try {
      await login(email, password);
      toast.success('Bentornato!');
      navigate('/', { replace: true });
    } catch (err) {
  console.error('Login error:', err);

  const errorMessage = String(err?.message || '').toLowerCase();

  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('invalid credentials')
  ) {
    toast.error(
      'Credenziali non valide. Se hai creato l’account con Google, accedi con “Continua con Google” oppure usa “Password dimenticata?” per impostare una password.'
    );
  } else if (errorMessage.includes('email not confirmed')) {
    toast.error('Devi confermare la tua email prima di accedere.');
  } else {
    toast.error(err?.message || 'Accesso non riuscito');
  }
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
    <div className="min-h-screen bg-background flex flex-col" data-testid="login-page">
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
            <div className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Bentornato</h1>
          <p className="text-gray-500 mt-1">Accedi a DealRadar</p>
        </div>

        <div className="space-y-3 mb-5">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl text-base font-semibold bg-white border-gray-200 hover:bg-gray-50"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading || authLoading}
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connessione a Google...
              </>
            ) : (
              <>
                <span className="mr-2 text-lg font-bold text-[#4285F4]">G</span>
                Continua con Google
              </>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">oppure</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Inserisci la password"
                className="h-12 rounded-xl pr-12"
                required
                data-testid="password-input"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Password dimenticata?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary rounded-xl text-base font-semibold"
            disabled={loading || googleLoading || authLoading}
            data-testid="login-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Non hai un account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;