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
  ShieldCheck,
  Shield,
  Camera,
  Loader2,
  Pencil,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { categories } from '../data/categories';
import {
  isOpportunityExpired,
  shouldOfferStandardRenewal,
  shouldOfferDealRenewal,
} from '../utils/opportunityLifecycle';


const AVATAR_MAX_UPLOAD_SIZE_MB = 5;
const AVATAR_MAX_UPLOAD_SIZE_BYTES = AVATAR_MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const AVATAR_MAX_STORED_SIZE_MB = 2;
const AVATAR_MAX_STORED_SIZE_BYTES = AVATAR_MAX_STORED_SIZE_MB * 1024 * 1024;
const AVATAR_MAX_WIDTH = 1024;
const AVATAR_MAX_HEIGHT = 1024;
const AVATAR_JPEG_QUALITY = 0.82;
const AVATAR_WEBP_QUALITY = 0.82;
const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const getAvatarFileExtension = (filename = '') => {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return '';
  return parts.pop();
};

const detectAvatarImageType = async (file) => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: 'image/png', extension: 'png' };
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
};

const sanitizeAvatarImage = async (file, detectedType) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = image;
      const ratio = Math.min(
        1,
        AVATAR_MAX_WIDTH / width,
        AVATAR_MAX_HEIGHT / height
      );

      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossibile elaborare l’immagine'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);

      const outputMime = detectedType.mime;
      const quality =
        outputMime === 'image/jpeg'
          ? AVATAR_JPEG_QUALITY
          : outputMime === 'image/webp'
            ? AVATAR_WEBP_QUALITY
            : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Impossibile elaborare l’immagine'));
            return;
          }

          resolve(
            new File(
              [blob],
              `avatar.${detectedType.extension}`,
              {
                type: outputMime,
                lastModified: Date.now(),
              }
            )
          );
        },
        outputMime,
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Immagine non valida'));
    };

    image.src = objectUrl;
  });
};

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
  const {
  user,
  logout,
  updateDisplayName,
  loading: authLoading,
} = useAuth();
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
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

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
          display_name,
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
      setProfileDisplayName(
  profileData?.display_name || user.name || ''
);

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

      const freeDeals = opportunities.filter(
        (opp) => Number(opp.estimated_price) === 0
      ).length;

      const points =
  Number(profileData?.points) ||
  totalDeals * 5 +
  verifiedDeals * 10 -
  hiddenDeals * 10;

      setStats({
        total_deals: totalDeals,
        free_deals: freeDeals,
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
        free_deals: 0,
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
          verified_deals
        `)
        .order('points', { ascending: false })
        .limit(leaderboardLimit);

      if (error) throw error;

      const cleanLeaderboard = (data || []).filter((profile) => {
  const name = String(profile.display_name || '').trim().toLowerCase();

  return (
    name &&
    name !== 'utente eliminato' &&
    profile.total_opportunities !== null
  );
});

setLeaderboard(cleanLeaderboard);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    }
  }, [leaderboardLimit]);

  useEffect(() => {
  if (authLoading) return;

  if (user) {
    loadUserData();
    loadLeaderboard();
  } else {
    setLoading(false);
  }
}, [authLoading, user, loadUserData, loadLeaderboard]);

  const handleAvatarUpload = async (event) => {
  try {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile || !user?.id) return;

    if (
      selectedFile.size <= 0 ||
      selectedFile.size > AVATAR_MAX_UPLOAD_SIZE_BYTES
    ) {
      toast.error(
        `Immagine troppo grande. Massimo ${AVATAR_MAX_UPLOAD_SIZE_MB} MB`
      );
      return;
    }

    const extension = getAvatarFileExtension(selectedFile.name);
    const declaredTypeAllowed = AVATAR_ALLOWED_MIME_TYPES.includes(selectedFile.type);
    const extensionAllowed = AVATAR_ALLOWED_EXTENSIONS.includes(extension);
    const detectedType = await detectAvatarImageType(selectedFile);

    if (!declaredTypeAllowed || !extensionAllowed || !detectedType) {
      toast.error('Formato non valido. Usa solo JPG, PNG o WEBP.');
      return;
    }

    if (
      detectedType.mime !== selectedFile.type &&
      !(detectedType.mime === 'image/jpeg' && selectedFile.type === 'image/jpg')
    ) {
      toast.error('Il contenuto del file non corrisponde al formato dichiarato.');
      return;
    }

    setUploadingAvatar(true);

    const oldAvatarUrl = avatarUrl;
    const sanitizedFile = await sanitizeAvatarImage(selectedFile, detectedType);

    if (sanitizedFile.size > AVATAR_MAX_STORED_SIZE_BYTES) {
      toast.error(
        `L’immagine resta troppo grande dopo l’elaborazione. Massimo ${AVATAR_MAX_STORED_SIZE_MB} MB.`
      );
      return;
    }

    const fileName = `${user.id}-${Date.now()}.${detectedType.extension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, sanitizedFile, {
        upsert: false,
        contentType: sanitizedFile.type,
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

    if (oldAvatarUrl && oldAvatarUrl !== publicUrl) {
      const oldFileName = oldAvatarUrl.split('/avatars/')[1];

      if (oldFileName && oldFileName.startsWith(user.id)) {
        await supabase.storage
          .from('avatars')
          .remove([oldFileName]);
      }
    }

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

const openNameEditor = () => {
  const currentName =
    profileDisplayName ||
    user?.name ||
    '';

  setEditedName(currentName);
  setNameEditorOpen(true);
};

const closeNameEditor = () => {
  if (savingName) return;

  setNameEditorOpen(false);
  setEditedName('');
};

const handleDisplayNameUpdate = async (event) => {
  event.preventDefault();

  if (savingName) return;

  const cleanedName = String(editedName || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (cleanedName.length < 2) {
    toast.error('Inserisci un nome valido');
    return;
  }

  if (cleanedName.length > 80) {
    toast.error('Il nome non può superare 80 caratteri');
    return;
  }

  const currentName =
    profileDisplayName ||
    user?.name ||
    '';

  if (cleanedName === currentName) {
    setNameEditorOpen(false);
    return;
  }

  try {
    setSavingName(true);

    const updatedUser = await updateDisplayName(cleanedName);

    if (!updatedUser) {
      throw new Error('Aggiornamento nome non riuscito');
    }

    // Aggiorna immediatamente la pagina senza attendere un nuovo fetch.
    setProfileDisplayName(cleanedName);

    setMyOpportunities((previous) =>
      previous.map((opportunity) => ({
        ...opportunity,
        user_name: cleanedName,
      }))
    );

    setSelectedOpportunity((previous) =>
      previous
        ? {
            ...previous,
            user_name: cleanedName,
          }
        : previous
    );

    setLeaderboard((previous) =>
      previous.map((profile) =>
        profile.user_id === user.id
          ? {
              ...profile,
              display_name: cleanedName,
            }
          : profile
      )
    );

    setNameEditorOpen(false);
    setEditedName('');

    toast.success('Nome aggiornato');
  } catch (err) {
    console.error('Display name update error:', err);

    toast.error(
      err?.message ||
        'Impossibile aggiornare il nome'
    );
  } finally {
    setSavingName(false);
  }
};

  const handleRenewOpportunity = async (opportunity, event) => {
    event?.stopPropagation?.();

    if (!opportunity?.id) return;

    if (opportunity.content_type === 'deal') {
      navigate(`/opportunities/${opportunity.id}/edit`);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('renew_my_opportunity', {
        p_opportunity_id: opportunity.id,
      });

      if (error) throw error;

      const renewed = data || {};
      setMyOpportunities((previous) =>
        previous.map((item) =>
          item.id === opportunity.id
            ? {
                ...item,
                ...renewed,
                lifecycle_status: 'active',
                expired_at: null,
                purge_after: null,
              }
            : item
        )
      );

      toast.success('Annuncio rinnovato per 90 giorni');
    } catch (error) {
      console.error('Renew opportunity error:', error);
      toast.error(error?.message || 'Impossibile rinnovare l’annuncio');
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

  if (authLoading) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

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

  const displayName =
  profileDisplayName ||
  user.name ||
  'Utente DealRadar';
  const displayAvatar = avatarUrl;
  const displayInitial = (displayName || user.email || 'U').charAt(0).toUpperCase();
  const activeOpportunities = myOpportunities.filter(
    (opportunity) => !isOpportunityExpired(opportunity)
  );
  const expiredOpportunities = myOpportunities.filter((opportunity) =>
    isOpportunityExpired(opportunity)
  );

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      <div className="pt-8 pb-16 px-4" style={{ backgroundColor: '#FF7A00' }}>
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
  <div className="flex items-center gap-2">
    <h2 className="text-xl font-bold text-white truncate">
      {displayName}
    </h2>

    <button
      type="button"
      onClick={openNameEditor}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20 hover:text-white"
      aria-label="Modifica nome e cognome"
      title="Modifica nome e cognome"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  </div>

  <p className="text-white/80 text-sm truncate">
    {user.email}
  </p>
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
                icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
                value={stats?.verified_deals || 0}
                label="Verificate"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Card className="bg-orange-50/70 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500" />
              Guadagna punti
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <PointsRow label="Invia opportunità" value="+5 pt" />
              <PointsRow label="Opportunità confermata" value="+10 pt" />
            </div>

            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-gray-500">
                Contributor: 50 pt • Trusted: 200 pt • Elite: 500 pt
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!loading && expiredOpportunities.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <CalendarClock className="h-5 w-5 text-amber-500" />
                Opportunità scadute
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Restano recuperabili per 30 giorni, poi vengono eliminate definitivamente.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
              {expiredOpportunities.length}
            </span>
          </div>

          <div className="space-y-4">
            {expiredOpportunities.map((opp) => (
              <Card key={opp.id} className="overflow-hidden border-amber-200">
                <OpportunityCard
                  opportunity={opp}
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setDetailOpen(true);
                  }}
                />
                <CardContent className="flex items-center justify-between gap-3 border-t border-amber-100 bg-amber-50/70 p-3">
                  <p className="text-xs text-amber-800">
                    {opp.content_type === 'deal'
                      ? 'Scegli una nuova scadenza per riattivare l’affare.'
                      : 'Puoi rinnovare questo annuncio per altri 90 giorni.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => handleRenewOpportunity(opp, event)}
                    className="flex-shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600"
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    {opp.content_type === 'deal' ? 'Modifica e rinnova' : 'Rinnova'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">Le mie opportunità attive</h3>
          {!loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
              {activeOpportunities.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        ) : activeOpportunities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Non hai opportunità attive</p>
              <Button
                onClick={() => navigate('/submit')}
                variant="outline"
                className="rounded-xl"
              >
                Pubblica una nuova opportunità
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeOpportunities.map((opp) => (
              <div key={opp.id} className="overflow-hidden rounded-xl border border-gray-100">
                <OpportunityCard
                  opportunity={opp}
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setDetailOpen(true);
                  }}
                />
                {(shouldOfferStandardRenewal(opp) || shouldOfferDealRenewal(opp)) && (
                  <div className="flex items-center justify-between gap-3 border-t border-orange-100 bg-orange-50/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-orange-800">
                      {opp.content_type === 'deal'
                        ? 'La scadenza è vicina. Scegli una nuova durata per mantenere attivo l’affare.'
                        : 'La scadenza è vicina. Puoi rinnovare ora per altri 90 giorni.'}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(event) => handleRenewOpportunity(opp, event)}
                      className="flex-shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600"
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      {opp.content_type === 'deal' ? 'Modifica scadenza' : 'Rinnova'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
        <div className="space-y-4">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Azioni principali</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate('/submit')}
                className="h-10 rounded-xl px-4 bg-primary"
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
                className="h-10 rounded-xl px-4"
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
                className="h-10 rounded-xl px-4"
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
                className="h-10 rounded-xl border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
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
                  className="h-10 rounded-xl border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
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

<div className="border-t pt-6">
  <h3 className="text-sm font-semibold text-gray-900 mb-4">
    Documenti e regolamenti
  </h3>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-8 text-sm">

    <button
  onClick={() => navigate('/privacy-policy')}
  className="text-left text-gray-600 hover:text-primary"
>
  Privacy Policy
</button>

<button
  onClick={() => navigate('/terms-of-service')}
  className="text-left text-gray-600 hover:text-primary"
>
  Termini
</button>

<button
  onClick={() => navigate('/support')}
  className="text-left text-gray-600 hover:text-primary"
>
  Supporto
</button>

<button
  onClick={() => navigate('/cookie-policy')}
  className="text-left text-gray-600 hover:text-primary"
>
  Cookie
</button>

<button
  onClick={() => navigate('/content-guidelines')}
  className="text-left text-gray-600 hover:text-primary"
>
  Linee guida
</button>

  </div>
</div>
          
        </div>
      </div>

      {nameEditorOpen && (
  <div
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeNameEditor();
      }
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-name-title"
      className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
    >
      <div className="mb-5">
        <h2
          id="edit-name-title"
          className="text-lg font-bold text-gray-900"
        >
          Modifica nome e cognome
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Il nuovo nome verrà mostrato sul tuo profilo e nelle tue attività su DealRadar.
        </p>
      </div>

      <form
        onSubmit={handleDisplayNameUpdate}
        className="space-y-5"
      >
        <div>
          <Label htmlFor="edit-display-name">
            Nome completo
          </Label>

          <Input
            id="edit-display-name"
            value={editedName}
            onChange={(event) =>
              setEditedName(event.target.value)
            }
            placeholder="Mario Rossi"
            autoComplete="name"
            autoFocus
            maxLength={80}
            disabled={savingName}
            className="mt-1.5 h-12 rounded-xl"
          />

          <p className="mt-1.5 text-xs text-gray-500">
            Questo è il nome che gli altri utenti vedranno su DealRadar.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={closeNameEditor}
            disabled={savingName}
            className="h-11 flex-1 rounded-xl"
          >
            Annulla
          </Button>

          <Button
            type="submit"
            disabled={savingName}
            className="h-11 flex-1 rounded-xl bg-primary"
          >
            {savingName ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva'
            )}
          </Button>
        </div>
      </form>
    </div>
  </div>
)}

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