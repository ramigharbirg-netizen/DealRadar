import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Radar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      toast.error('Inserisci la tua email');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) throw error;

      toast.success('Email di recupero inviata. Controlla la tua casella email.');
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(err?.message || 'Impossibile inviare email di recupero');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="forgot-password-page">
      <div className="p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => navigate('/login')}
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

          <h1 className="text-2xl font-bold text-gray-900">Recupera password</h1>
          <p className="text-gray-500 mt-1">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1.5">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                className="h-12 rounded-xl pl-11"
                required
                autoComplete="email"
              />
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary rounded-xl text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Invio in corso...
              </>
            ) : (
              'Invia link di recupero'
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Ti ricordi la password?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;