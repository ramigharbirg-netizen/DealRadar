import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Radar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      toast.success('Account created! Start hunting deals! 🎯');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="register-page">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => navigate('/')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
            <Radar className="w-8 h-8 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-primary animate-ping opacity-20"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join DealRadar</h1>
          <p className="text-gray-500 mt-1">Discover opportunities near you</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="name-input"
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
              placeholder="your@email.com"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="email-input"
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
                placeholder="At least 6 characters"
                className="h-12 rounded-xl pr-12"
                required
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary rounded-xl text-base font-semibold"
            disabled={loading}
            data-testid="register-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </p>

        {/* Benefits */}
        <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm font-medium text-gray-700 mb-2">Why join DealRadar?</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Discover deals near you in real-time</li>
            <li>• Earn points for reporting opportunities</li>
            <li>• Climb the leaderboard and earn badges</li>
            <li>• Get notified about new opportunities</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
