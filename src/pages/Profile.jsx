import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  User,
  LogOut,
  MapPin,
  Plus,
  ChevronRight,
  Award,
  Bell,
  BellOff,
  Trophy,
  Star,
  Settings,
  TrendingUp,
  ShieldCheck,
  Shield,
  Camera,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { toast } from 'sonner';

const categories = [
  { id: 'store_liquidation', name: 'Liquidazione negozio' },
  { id: 'product_stock', name: 'Stock prodotti' },
  { id: 'equipment', name: 'Attrezzature' },
  { id: 'business_sale', name: 'Attività in vendita' },
  { id: 'auctions', name: 'Aste' },
  { id: 'user_reported', name: 'Segnalate dagli utenti' },
];

const createPasswordCheckClient = () => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configurazione Supabase mancante');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `dealradar-password-check-${Date.now()}`,
    },
  });
};

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [myOpportunities, setMyOpportunities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationCategories, setNotificationCategories] = useState([]);
  const [notificationRadius, setNotificationRadius] = useState(20);
  const [leaderboardLimit, setLeaderboardLimit] = useState(5);

  const loadUserData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          avatar_url,
          points,
          trust_score,
          reputation_level,
          total_opportunities,
          verified_deals,
          hidden_deals,
          is_premium
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile load error:', profileError);
      }

      setAvatarUrl(profileData?.avatar_url || null);

      const { data: myOpps, error: oppsError } = await supabase
        .from('opportunities')
        .select(`
          *,
          user_profiles (
            avatar_url,
            trust_score,
            verified_deals,
            points,
            approved_submissions,
            total_opportunities,
            is_premium
          )
        `)
        .eq('user_id', user.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (oppsError) throw oppsError;

      const { data: adminData, error: adminError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id);

      if (adminError) {
        console.error('Admin role check error:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(
          Array.isArray(adminData) &&
            adminData.some((row) => row.role === 'admin' || row.role === 'owner')
        );
      }

      const opportunities = myOpps || [];

      const enrichedOpportunities = opportunities.map((opp) => ({
        ...opp,
        avatar_url: opp.user_profiles?.avatar_url || null,
        is_premium: opp.user_profiles?.is_premium || false,
        trust_score: opp.user_profiles?.trust_score || 0,
        verified_deals: opp.user_profiles?.verified_deals || 0,
        profile_points: opp.user_profiles?.points || 0,
        approved_submissions: opp.user_profiles?.approved_submissions || 0,
        total_opportunities_profile: opp.user_profiles?.total_opportunities || 0,
      }));

      const totalDeals =
        Number(profileData?.total_opportunities) || opportunities.length;

      const verifiedDeals =
        Number(profileData?.verified_deals) ||
        opportunities.filter((opp) => opp.is_verified).length;

      const hiddenDeals = Number(profileData?.hidden_deals) || 0;

      const highValueDeals = opportunities.filter((opp) => opp.is_high_value).length;

      const freeDeals = opportunities.filter(
        (opp) => Number(opp.estimated_price) === 0
      ).length;

      const totalEstimatedProfit = opportunities.reduce((sum, opp) => {
        const price = Number(opp.estimated_price);
        const resale = Number(opp.estimated_resale_value);

        if (Number.isNaN(price) || Number.isNaN(resale)) return sum;

        return sum + Math.max(resale - price, 0);
      }, 0);

      const points =
        Number(profileData?.points) ||
        totalDeals * 5 + verifiedDeals * 10 + highValueDeals * 20 - hiddenDeals * 10;

      setStats({
        total_deals: totalDeals,
        high_value_deals: highValueDeals,
        free_deals: freeDeals,
        estimated_profit: totalEstimatedProfit,
        points,
        reputation: Number(profileData?.trust_score) || totalDeals,
        opportunities_posted: totalDeals,
        verified_deals: verifiedDeals,
        hidden_deals: hiddenDeals,
      });

      setMyOpportunities(enrichedOpportunities);

      const savedPreferences = localStorage.getItem(
        'dealradar_notification_preferences'
      );

      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        setNotificationsEnabled(parsed.notificationsEnabled ?? true);
        setNotificationCategories(parsed.notificationCategories || []);
        setNotificationRadius(parsed.notificationRadius || 20);
      }
    } catch (err) {
      console.error('Error loading user data:', err);

      setStats({
        total_deals: 0,
        high_value_deals: 0,
        free_deals: 0,
        estimated_profit: 0,
        points: 0,
        reputation: 0,
        opportunities_posted: 0,
        verified_deals: 0,
        hidden_deals: 0,
      });

      setMyOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('public_user_profiles')
        .select(`
          user_id,
          display_name,
          avatar_url,
          is_premium,
          points,
          trust_score,
          reputation_level,
          total_opportunities,
          verified_deals,
          hidden_deals
        `)
        .order('points', { ascending: false })
        .limit(leaderboardLimit);

      if (error) throw error;

      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    }
  }, [leaderboardLimit]);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadLeaderboard();
    } else {
      setLoading(false);
    }
  }, [user, loadUserData, loadLeaderboard]);

  const handleAvatarUpload = async (event) => {
    try {
      const file = event.target.files?.[0];

      if (!file || !user?.id) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Puoi caricare solo immagini');
        return;
      }

      const maxSizeMb = 5;
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Immagine troppo grande. Massimo ${maxSizeMb} MB`);
        return;
      }

      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Foto profilo aggiornata');
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Errore caricamento avatar');
    } finally {
      setUploadingAvatar(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logout effettuato con successo');
    navigate('/', { replace: true });
  };

  const handleDeleteAccount = async () => {
  if (deletingAccount) return;

  const confirmed = window.confirm(
    'Vuoi eliminare definitivamente il tuo account DealRadar? Questa azione non può essere annullata.'
  );

  if (!confirmed) return;

  const password = window.prompt(
    'Per sicurezza, inserisci la tua password per confermare l’eliminazione definitiva.'
  );

  if (!password) {
    toast.error('Eliminazione account annullata');
    return;
  }

  try {
    setDeletingAccount(true);

    const passwordCheckClient = createPasswordCheckClient();

    const {
      data: passwordData,
      error: passwordError,
    } = await passwordCheckClient.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (passwordError || !passwordData?.session?.access_token) {
      toast.error('Password non corretta');
      return;
    }

    const deleteAccessToken = passwordData.session.access_token;

    const response = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deleteAccessToken}`,
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Eliminazione account non riuscita');
    }

    if (!result?.success) {
      throw new Error(result?.error || 'Eliminazione account non riuscita');
    }

    toast.success('Account eliminato definitivamente');

    await logout();
    navigate('/login', { replace: true });
  } catch (err) {
    console.error('Delete account error:', err);
    toast.error(err?.message || 'Impossibile eliminare l’account');
  } finally {
    setDeletingAccount(false);
  }
};

  const saveNotificationPreferences = () => {
    try {
      localStorage.setItem(
        'dealradar_notification_preferences',
        JSON.stringify({
          notificationsEnabled,
          notificationCategories,
          notificationRadius,
          savedAt: new Date().toISOString(),
        })
      );

      toast.success('Preferenze notifiche salvate');
      setSettingsOpen(false);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      toast.error('Impossibile salvare le preferenze');
    }
  };

  const toggleCategory = (categoryId) => {
    setNotificationCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Benvenuto su DealRadar
          </h2>

          <p className="text-gray-500 mb-6">
            Accedi o crea un account per scoprire occasioni, guadagnare punti e
            scalare la classifica
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-primary rounded-xl h-12"
              data-testid="login-btn"
            >
              Accedi
            </Button>

            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              className="w-full rounded-xl h-12"
              data-testid="register-btn"
            >
              Crea account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.name || 'Utente DealRadar';
  const displayAvatar = avatarUrl;
  const displayInitial = (displayName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      <div className="bg-gradient-to-br from-primary to-emerald-400 pt-8 pb-16 px-4">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Profilo</h1>

          <div className="flex gap-2">
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                  data-testid="settings-btn"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Impostazioni notifiche</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notificationsEnabled ? (
                        <Bell className="w-5 h-5 text-primary" />
                      ) : (
                        <BellOff className="w-5 h-5 text-gray-400" />
                      )}

                      <span className="font-medium">Notifiche</span>
                    </div>

                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                      data-testid="notifications-toggle"
                    />
                  </div>

                  {notificationsEnabled && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Raggio notifiche
                        </label>

                        <Select
                          value={String(notificationRadius)}
                          onValueChange={(v) => setNotificationRadius(Number(v))}
                        >
                          <SelectTrigger data-testid="notification-radius-select">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="5">5 km</SelectItem>
                            <SelectItem value="10">10 km</SelectItem>
                            <SelectItem value="20">20 km</SelectItem>
                            <SelectItem value="50">50 km</SelectItem>
                          </SelectContent>
                        </Select>

                        <p className="text-xs text-gray-500 mt-1">
                          Ricevi notifiche sulle occasioni entro questa distanza
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 block">
                          Categorie da seguire
                        </label>

                        <p className="text-xs text-gray-500 mb-3">
                          Lascia tutto deselezionato per ricevere tutte le categorie
                        </p>

                        <div className="space-y-3">
                          {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-3">
                              <Checkbox
                                id={cat.id}
                                checked={notificationCategories.includes(cat.id)}
                                onCheckedChange={() => toggleCategory(cat.id)}
                              />

                              <label htmlFor={cat.id} className="text-sm">
                                {cat.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={saveNotificationPreferences}
                    className="w-full bg-primary rounded-xl h-11"
                    data-testid="save-preferences-btn"
                  >
                    Salva preferenze
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-white hover:bg-white/20"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                <span className="text-2xl font-bold text-white">
                  {displayInitial}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg disabled:opacity-60"
              aria-label="Carica foto profilo"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
              ) : (
                <Camera className="h-4 w-4 text-gray-700" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">
              {displayName}
            </h2>
            <p className="text-white/80 text-sm truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <StatItem
                icon={<Star className="w-4 h-4 text-primary" />}
                value={stats?.points || 0}
                label="Punti"
              />
              <StatItem
                icon={<Award className="w-4 h-4 text-amber-500" />}
                value={stats?.reputation || 0}
                label="Reputazione"
              />
              <StatItem
                icon={<MapPin className="w-4 h-4 text-blue-500" />}
                value={stats?.opportunities_posted || myOpportunities.length}
                label="Pubblicate"
              />
              <StatItem
                icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                value={stats?.verified_deals || 0}
                label="Verificate"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Card className="bg-gradient-to-r from-primary/5 to-emerald-50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Guadagna punti
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <PointsRow label="Invia opportunità" value="+5 pt" />
              <PointsRow label="Opportunità confermata" value="+10 pt" />
              <PointsRow label="Alto valore verificato" value="+20 pt" />
            </div>

            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-gray-500">
                Contributor: 50 pt • Trusted: 200 pt • Elite: 500 pt
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Migliori cacciatori di opportunità
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-500">Nessun dato disponibile</p>
              ) : (
                leaderboard.map((hunter, index) => {
                  const isCurrentUser = hunter.user_id === user.id;
                  const hunterName = hunter.display_name || 'Utente DealRadar';

                  return (
                    <div
                      key={hunter.user_id}
                      onClick={() => navigate(`/users/${hunter.user_id}`)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition hover:bg-gray-50 ${
                        isCurrentUser ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white overflow-hidden border border-gray-200">
                          {hunter.avatar_url ? (
                            <img
                              src={hunter.avatar_url}
                              alt={hunterName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-black text-gray-700">
                              {hunterName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <span
                          className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                            index === 0
                              ? 'bg-yellow-400 text-yellow-900'
                              : index === 1
                              ? 'bg-gray-300 text-gray-800'
                              : index === 2
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1 font-medium text-sm truncate">
                          <span className="truncate">
                            {hunterName} {isCurrentUser && '(Tu)'}
                          </span>

                          {hunter.is_premium && (
                            <span
                              title="Premium"
                              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
                            >
                              ✓
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-gray-500">
                          {hunter.total_opportunities || 0} opportunità •{' '}
                          {hunter.verified_deals || 0} verificate •{' '}
                          {hunter.points || 0} pt
                        </p>
                      </div>

                      <Badge className="capitalize">
                        {(hunter.reputation_level || 'new_member').replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })
              )}

              {leaderboard.length >= leaderboardLimit && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl mt-3"
                  onClick={() => setLeaderboardLimit((prev) => prev + 5)}
                >
                  Mostra altri
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Azioni principali</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/submit')}
                className="h-12 bg-primary rounded-xl justify-between"
                data-testid="submit-opportunity-btn"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Nuova opportunità
                </span>

                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => navigate('/favorites')}
                variant="outline"
                className="h-12 rounded-xl justify-between"
                data-testid="view-favorites-btn"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4" />
                  Salvate
                </span>

                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => navigate('/privacy-settings')}
                variant="outline"
                className="h-12 rounded-xl justify-between"
              >
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Privacy
                </span>

                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                onClick={handleDeleteAccount}
                variant="outline"
                disabled={deletingAccount}
                className="h-12 rounded-xl justify-between border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              >
                <span className="flex items-center gap-2 text-sm">
                  {deletingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {deletingAccount ? 'Eliminazione...' : 'Elimina account'}
                </span>

                <ChevronRight className="w-4 h-4" />
              </Button>

              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin/moderation')}
                  variant="outline"
                  className="h-12 rounded-xl justify-between border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4" />
                    Moderazione
                  </span>

                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documenti e regolamenti</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/privacy-policy"
                className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 hover:bg-gray-50 transition"
              >
                <span className="text-sm font-medium">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="/terms-of-service"
                className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 hover:bg-gray-50 transition"
              >
                <span className="text-sm font-medium">Termini</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="/support"
                className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 hover:bg-gray-50 transition"
              >
                <span className="text-sm font-medium">Supporto</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="/cookie-policy"
                className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 hover:bg-gray-50 transition"
              >
                <span className="text-sm font-medium">Cookie</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="/content-guidelines"
                className="flex h-12 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 hover:bg-gray-50 transition"
              >
                <span className="text-sm font-medium">Linee guida</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Le mie opportunità
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        ) : myOpportunities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />

              <p className="text-gray-500 mb-4">
                Non hai ancora pubblicato opportunità
              </p>

              <Button
                onClick={() => navigate('/submit')}
                variant="outline"
                className="rounded-xl"
              >
                Invia la tua prima opportunità
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onClick={() => {
                  setSelectedOpportunity(opp);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

const StatItem = ({ icon, value, label }) => (
  <div className="text-center px-2">
    <div className="flex items-center justify-center mb-1">{icon}</div>
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const PointsRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}</span>
    <span className="font-semibold text-primary">{value}</span>
  </div>
);

export default Profile;