import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  TrendingUp,
  Clock,
  Heart,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Share2,
  User,
  Navigation,
  Star,
  Euro,
  X,
  Flag,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Edit,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const COMMENT_MIN_LENGTH = 3;
const COMMENT_MAX_LENGTH = 500;
const COMMENT_COOLDOWN_SECONDS = 10;
const REPORTS_AUTO_HIDE_THRESHOLD = 3;
const REPORTS_DAILY_LIMIT = 10;
const VERIFIED_THRESHOLD = 3;

const categoryConfig = {
  store_liquidation: { name: 'Liquidazione negozio', color: 'bg-green-500' },
  product_stock: { name: 'Stock prodotti', color: 'bg-amber-500' },
  equipment: { name: 'Attrezzatura', color: 'bg-blue-500' },
  business_sale: { name: 'Vendita attività', color: 'bg-purple-500' },
  auctions: { name: 'Aste', color: 'bg-red-500' },
  user_reported: { name: 'Segnalazione utente', color: 'bg-orange-500' },
  free_deals: { name: 'Gratis', color: 'bg-green-600' },
};

const reportReasons = [
  { id: 'fraud', label: 'Possibile truffa' },
  { id: 'illegal_item', label: 'Prodotto o attività illegale' },
  { id: 'prohibited_item', label: 'Prodotto vietato' },
  { id: 'spam', label: 'Spam o contenuto ingannevole' },
  { id: 'copyright', label: 'Violazione copyright o marchio' },
  { id: 'personal_data', label: 'Dati personali pubblicati senza consenso' },
  { id: 'offensive', label: 'Contenuto offensivo o discriminatorio' },
  { id: 'other', label: 'Altro' },
];

const defaultAuthorTrust = {
  score: 0,
  totalOpportunities: 0,
  verifiedOpportunities: 0,
  hiddenOpportunities: 0,
  reportsReceived: 0,
  level: 'new',
  label: 'Nuovo autore',
  description: 'Autore ancora da valutare',
};

const formatPrice = (price) => {
  if (price === null || price === undefined || Number.isNaN(Number(price))) return null;

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(price));
};

const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDistance = (km) => {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return null;
  if (Number(km) < 1) return `${Math.round(Number(km) * 1000)} m da te`;
  return `${Number(km).toFixed(1)} km da te`;
};

const cleanCommentText = (text) => {
  return text.replace(/\s+/g, ' ').trim();
};

const calculateAuthorTrust = (opportunities = []) => {
  const totalOpportunities = opportunities.length;
  const verifiedOpportunities = opportunities.filter((opp) => opp.is_verified === true).length;
  const hiddenOpportunities = opportunities.filter((opp) => opp.is_hidden === true).length;
  const reportsReceived = opportunities.reduce(
    (sum, opp) => sum + Number(opp.reports || 0),
    0
  );

  const score = Math.max(
    0,
    totalOpportunities * 2 +
      verifiedOpportunities * 20 -
      hiddenOpportunities * 25 -
      reportsReceived * 5
  );

  if (hiddenOpportunities >= 2 || reportsReceived >= 6) {
    return {
      score,
      totalOpportunities,
      verifiedOpportunities,
      hiddenOpportunities,
      reportsReceived,
      level: 'risky',
      label: 'Autore da monitorare',
      description: 'Ha ricevuto diverse segnalazioni',
    };
  }

  if (verifiedOpportunities >= 3 && score >= 40) {
    return {
      score,
      totalOpportunities,
      verifiedOpportunities,
      hiddenOpportunities,
      reportsReceived,
      level: 'trusted',
      label: 'Autore affidabile',
      description: 'Più opportunità verificate dalla community',
    };
  }

  if (verifiedOpportunities >= 1 || score >= 15) {
    return {
      score,
      totalOpportunities,
      verifiedOpportunities,
      hiddenOpportunities,
      reportsReceived,
      level: 'growing',
      label: 'Autore in crescita',
      description: 'Ha già segnali positivi dalla community',
    };
  }

  return {
    score,
    totalOpportunities,
    verifiedOpportunities,
    hiddenOpportunities,
    reportsReceived,
    level: 'new',
    label: 'Nuovo autore',
    description: 'Autore ancora da valutare',
  };
};

export const OpportunityDetail = ({ opportunity, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [verifiedByUser, setVerifiedByUser] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authorTrust, setAuthorTrust] = useState(defaultAuthorTrust);
  const [sendingPickup, setSendingPickup] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingFavoriteState, setLoadingFavoriteState] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  const cleanedComment = useMemo(() => cleanCommentText(newComment), [newComment]);

  const commentTooShort =
    cleanedComment.length > 0 && cleanedComment.length < COMMENT_MIN_LENGTH;

  const commentTooLong = cleanedComment.length > COMMENT_MAX_LENGTH;

  const canSubmitComment =
    !!user &&
    !sendingComment &&
    cleanedComment.length >= COMMENT_MIN_LENGTH &&
    cleanedComment.length <= COMMENT_MAX_LENGTH;

  const category = useMemo(() => {
    return categoryConfig[opportunity?.category] || categoryConfig.user_reported;
  }, [opportunity?.category]);

  const profit = useMemo(() => {
    if (
      opportunity?.estimated_resale_value === null ||
      opportunity?.estimated_resale_value === undefined ||
      opportunity?.estimated_price === null ||
      opportunity?.estimated_price === undefined
    ) {
      return null;
    }

    const resale = Number(opportunity.estimated_resale_value);
    const price = Number(opportunity.estimated_price);

    if (Number.isNaN(resale) || Number.isNaN(price)) return null;

    return resale - price;
  }, [opportunity?.estimated_resale_value, opportunity?.estimated_price]);

  const checkIfVerified = useCallback(async () => {
    if (!user?.id || !opportunity?.id) {
      setVerifiedByUser(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('opportunity_confirmations')
        .select('id')
        .eq('opportunity_id', opportunity.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setVerifiedByUser(!!data);
    } catch (err) {
      console.error('Check verification failed:', err);
      setVerifiedByUser(false);
    }
  }, [opportunity?.id, user?.id]);

  const loadAuthorTrust = useCallback(async () => {
    if (!opportunity?.user_id) {
      setAuthorTrust(defaultAuthorTrust);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, is_verified, is_hidden, reports')
        .eq('user_id', opportunity.user_id)
        .limit(500);

      if (error) throw error;

      setAuthorTrust(calculateAuthorTrust(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Author trust check failed:', err);
      setAuthorTrust(defaultAuthorTrust);
    }
  }, [opportunity?.user_id]);

    const handleDeleteOpportunity = async () => {
    if (!user?.id || !opportunity?.id) return;

    const confirmed = window.confirm(
      'Vuoi davvero eliminare questa opportunità? Questa azione non può essere annullata.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunity.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Opportunità eliminata');
      onClose(false);
      window.location.reload();
    } catch (err) {
      console.error('Delete opportunity error:', err);
      toast.error('Impossibile eliminare questa opportunità');
    }
  };

  useEffect(() => {
    if (!opportunity?.id || !open) return;

    let cancelled = false;

    const loadData = async () => {
      setLoadingComments(true);
      setLoadingFavoriteState(true);

      try {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('opportunity_id', opportunity.id)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        const commentsWithProfiles = await Promise.all(
  (commentsData || []).map(async (comment) => {
    const { data: profile } = await supabase
      .from('public_user_profiles')
      .select('avatar_url, is_premium')
      .eq('user_id', comment.user_id)
      .single();

    return {
      ...comment,
      avatar_url: profile?.avatar_url || null,
      is_premium: profile?.is_premium || false,
    };
  })
);

        if (!cancelled) {
          setComments(commentsWithProfiles);
        }
      } catch (err) {
        console.error('Error loading comments:', err);

        if (!cancelled) {
          setComments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingComments(false);
        }
      }

      if (user) {
        try {
          const { data: favoriteData, error: favoriteError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('opportunity_id', opportunity.id)
            .maybeSingle();

          if (favoriteError) throw favoriteError;

          if (!cancelled) {
            setIsFavorite(!!favoriteData);
          }
        } catch (err) {
          console.error('Error checking favorite:', err);

          if (!cancelled) {
            setIsFavorite(false);
          }
        } finally {
          if (!cancelled) {
            setLoadingFavoriteState(false);
          }
        }
      } else if (!cancelled) {
        setIsFavorite(false);
        setLoadingFavoriteState(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [opportunity?.id, open, user]);

  useEffect(() => {
    if (!open) {
      setGalleryOpen(false);
      setSelectedImageIndex(0);
      setNewComment('');
      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
      setSendingComment(false);
      setSendingReport(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    checkIfVerified();
    loadAuthorTrust();
  }, [open, checkIfVerified, loadAuthorTrust]);

  const handleFavorite = async () => {
    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Devi fare login per salvare le opportunità');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('opportunity_id', opportunity.id);

        if (error) throw error;

        setIsFavorite(false);
        toast.success('Rimosso dai preferiti');
      } else {
        const { error } = await supabase.from('favorites').insert([
          {
            user_id: user.id,
            opportunity_id: opportunity.id,
          },
        ]);

        if (error) throw error;

        setIsFavorite(true);
        toast.success('Aggiunto ai preferiti');
      }
    } catch (err) {
      console.error('Favorite action failed:', err);
      toast.error('Operazione non riuscita');
    }
  };

  const handleReport = async () => {
    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Devi fare login per segnalare un contenuto');
      navigate('/login');
      return;
    }

    if (!reportReason) {
      toast.error('Seleziona un motivo della segnalazione');
      return;
    }

    setSendingReport(true);

    try {
      const { data: existingReport, error: existingError } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('opportunity_id', opportunity.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingReport) {
        toast.error('Hai già segnalato questa opportunità');
        setSendingReport(false);
        return;
      }

      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { count: reportsCount, error: rateLimitError } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', user.id)
        .gte('created_at', twentyFourHoursAgo);

      if (rateLimitError) throw rateLimitError;

      if ((reportsCount || 0) >= REPORTS_DAILY_LIMIT) {
        toast.error('Hai raggiunto il limite di segnalazioni nelle ultime 24 ore');
        setSendingReport(false);
        return;
      }

      const { error } = await supabase.from('reports').insert([
        {
          reporter_id: user.id,
          opportunity_id: opportunity.id,
          reason: reportReason,
          details: reportDetails.trim() || null,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      const currentReports = Number(opportunity.reports || 0) + 1;
      const shouldHide = currentReports >= REPORTS_AUTO_HIDE_THRESHOLD;

      const updatePayload = {
        reports: currentReports,
      };

      if (shouldHide) {
        updatePayload.is_hidden = true;
        updatePayload.hidden_reason = 'too_many_reports';
      }

      const { error: updateError } = await supabase
        .from('opportunities')
        .update(updatePayload)
        .eq('id', opportunity.id);

      if (updateError) {
        console.error('Update reports error:', updateError);
      }

      toast.success(
        'Segnalazione inviata. Grazie per aiutarci a mantenere DealRadar sicuro.'
      );

      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (err) {
      console.error('Report failed:', err);
      toast.error('Impossibile inviare la segnalazione');
    } finally {
      setSendingReport(false);
    }
  };

  const handleVerifyOpportunity = async () => {
    if (!user) {
      toast.error('Devi fare login');
      navigate('/login');
      return;
    }

    if (!opportunity?.id) return;

    if (opportunity.user_id === user.id) {
      toast.error('Non puoi verificare una tua opportunità');
      return;
    }

    if (verifiedByUser) {
      toast.error('Hai già verificato questa opportunità');
      return;
    }

    setVerifying(true);

    try {
      const { error: confirmationError } = await supabase
        .from('opportunity_confirmations')
        .insert([
          {
            opportunity_id: opportunity.id,
            user_id: user.id,
          },
        ]);

      if (confirmationError) throw confirmationError;

      setVerifiedByUser(true);
      toast.success('Opportunità verificata');

      await loadAuthorTrust();
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error('Errore verifica opportunità');
    } finally {
      setVerifying(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();

    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Devi fare login per commentare');
      navigate('/login');
      return;
    }

    const content = cleanCommentText(newComment);

    if (content.length < COMMENT_MIN_LENGTH) {
      toast.error(`Il commento deve contenere almeno ${COMMENT_MIN_LENGTH} caratteri`);
      return;
    }

    if (content.length > COMMENT_MAX_LENGTH) {
      toast.error(`Il commento non può superare ${COMMENT_MAX_LENGTH} caratteri`);
      return;
    }

    const lastUserComment = comments.find((comment) => comment.user_id === user.id);

    if (
      lastUserComment &&
      lastUserComment.content?.trim().toLowerCase() === content.trim().toLowerCase()
    ) {
      toast.error('Non puoi inviare due commenti identici consecutivi');
      return;
    }

    const storageKey = `dealradar_last_comment_${user.id}`;
    const lastCommentTime = Number(localStorage.getItem(storageKey) || 0);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastCommentTime) / 1000);

    if (lastCommentTime && elapsedSeconds < COMMENT_COOLDOWN_SECONDS) {
      const remaining = COMMENT_COOLDOWN_SECONDS - elapsedSeconds;
      toast.error(`Aspetta ${remaining} secondi prima di inviare un altro commento`);
      return;
    }

    setSendingComment(true);

    try {
      const payload = {
        opportunity_id: opportunity.id,
        user_id: user.id,
        user_name: user.name || user.email || 'Utente',
        content,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem(storageKey, String(now));

      if (data) {
  const { data: myProfile } = await supabase
    .from('public_user_profiles')
    .select('avatar_url, is_premium')
    .eq('user_id', user.id)
    .single();

  setComments((prev) => [
    {
      ...data,
      avatar_url: myProfile?.avatar_url || null,
      is_premium: myProfile?.is_premium || false,
    },
    ...prev,
  ]);
}

      setNewComment('');
      toast.success('Commento aggiunto');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Impossibile aggiungere il commento');
    } finally {
      setSendingComment(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: opportunity?.title || 'Opportunità DealRadar',
          text: opportunity?.description || '',
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiato negli appunti');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error('Impossibile copiare il link');
    }
  };

  const handlePickupRequest = async () => {
    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Devi fare login per richiedere il ritiro');
      navigate('/login');
      return;
    }

    setSendingPickup(true);

    try {
      const { error: pickupError } = await supabase.from('pickup_requests').insert([
        {
          opportunity_id: opportunity.id,
          requester_name: user.name || user.email,
          requester_email: user.email,
          owner_name: opportunity.user_name || null,
          owner_email: null,
          status: 'pending',
        },
      ]);

      if (pickupError) throw pickupError;

      let conversationData = null;

const { data: existingConversation, error: existingConvError } = await supabase
  .from('conversations')
  .select('*')
  .eq('opportunity_id', opportunity.id)
  .eq('requester_id', user.id)
  .eq('owner_id', opportunity.user_id)
  .maybeSingle();

if (existingConvError) throw existingConvError;

if (existingConversation) {
  conversationData = existingConversation;
} else {
  const { data: newConversation, error: convError } = await supabase
    .from('conversations')
    .insert([
      {
        opportunity_id: opportunity.id,
        requester_id: user.id,
        owner_id: opportunity.user_id || null,
      },
    ])
    .select()
    .single();

  if (convError) throw convError;

  conversationData = newConversation;
}

      if (!existingConversation) {
  const { error: messageError } = await supabase.from('conversation_messages').insert([
    {
      conversation_id: conversationData.id,
      sender_name: user.name || user.email,
      sender_email: user.email,
      sender_id: user.id,
      message:
        Number(opportunity.estimated_price) === 0
          ? 'Ciao, sono interessato al ritiro. Quando sarebbe possibile passare?'
          : 'Ciao, sono interessato a questa opportunità. È ancora disponibile?',
    },
  ]);

  if (messageError) throw messageError;
}

      toast.success('Chat aperta 🚀');
      onClose(false);
      navigate(`/chats/${conversationData.id}`);
    } catch (err) {
      console.error('Pickup request error:', err);
      toast.error('Errore durante l’invio della richiesta');
    } finally {
      setSendingPickup(false);
    }
  };

  if (!opportunity) return null;

  const trustBadgeClasses = {
    trusted: 'bg-emerald-50 text-emerald-700',
    growing: 'bg-blue-50 text-blue-700',
    risky: 'bg-orange-50 text-orange-700',
    new: 'bg-gray-100 text-gray-600',
  };

  const TrustIcon = authorTrust.level === 'risky' ? AlertTriangle : ShieldCheck;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[84vh] w-full p-0 rounded-t-3xl sm:top-4 sm:bottom-4 sm:left-1/2 sm:right-auto sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[680px] sm:-translate-x-1/2 sm:translate-y-0 sm:rounded-2xl"
        data-testid="opportunity-detail-sheet"
      >
        <div className="flex h-full max-h-[calc(100vh-2rem)] flex-col bg-white">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-gray-100"
                onClick={() => onClose(false)}
                data-testid="close-detail-btn"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-gray-100"
                  onClick={() => setReportOpen(true)}
                  data-testid="report-btn"
                >
                  <Flag className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-gray-100"
                  onClick={handleShare}
                  data-testid="share-btn"
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full ${
                    isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100'
                  }`}
                  onClick={handleFavorite}
                  disabled={loadingFavoriteState}
                  data-testid="favorite-btn"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>

                {String(opportunity.user_id) !== String(user?.id) && (
                  <Button
                    onClick={handleVerifyOpportunity}
                    disabled={verifying || verifiedByUser}
                    variant={verifiedByUser ? 'secondary' : 'outline'}
                    className="h-9 rounded-full px-3 text-xs"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Verifico...
                      </>
                    ) : verifiedByUser ? (
                      'Verificata'
                    ) : (
                      'Verifica'
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className={`${category.color} border-0 text-white`}>
                  {category.name}
                </Badge>

                {opportunity.is_verified && (
                  <Badge className="border-0 bg-emerald-500 text-white">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verificata
                  </Badge>
                )}

                {!opportunity.is_verified && Number(opportunity.verified_count || 0) > 0 && (
                  <Badge className="border-0 bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    {Number(opportunity.verified_count || 0) === 1
                      ? '1 verifica'
                      : `${Number(opportunity.verified_count || 0)} verifiche`}
                  </Badge>
                )}

                {opportunity.is_high_value && (
                  <Badge className="border-0 bg-yellow-400 text-yellow-900">
                    <Star className="mr-1 h-3 w-3" />
                    Alto valore
                  </Badge>
                )}

                {Number(opportunity.estimated_price) === 0 && (
                  <Badge className="border-0 bg-green-500 text-white">GRATIS</Badge>
                )}
              </div>

              <SheetHeader className="space-y-1 p-0 text-left">
                <SheetTitle className="leading-tight text-lg font-bold text-gray-900">
                  {opportunity.title}
                </SheetTitle>

                <SheetDescription className="sr-only">
                  Dettaglio completo dell’opportunità selezionata, con informazioni, contatti, commenti e azioni disponibili.
                </SheetDescription>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {opportunity.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {opportunity.address}
                    </span>
                  )}

                  {opportunity.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(opportunity.created_at)}
                    </span>
                  )}
                </div>

                {opportunity.distance_km !== undefined && opportunity.distance_km !== null && (
                  <div className="w-fit rounded-lg bg-primary/10 px-3 py-1.5">
                    <span className="flex items-center gap-2 text-sm font-bold text-primary">
                      <Navigation className="h-4 w-4" />
                      {formatDistance(opportunity.distance_km)}
                    </span>
                  </div>
                )}
              </SheetHeader>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 p-4">
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-3">
                <div className="mb-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                      <Euro className="h-3 w-3" />
                      Prezzo
                    </p>

                    {Number(opportunity.estimated_price) === 0 ? (
                      <span className="inline-block rounded-md bg-green-500 px-2 py-1 text-xs font-bold text-white">
                        GRATIS
                      </span>
                    ) : (
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(opportunity.estimated_price) || 'Contatta'}
                      </p>
                    )}
                  </div>

                  {opportunity.estimated_resale_value !== null &&
                    opportunity.estimated_resale_value !== undefined && (
                      <div>
                        <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                          <Euro className="h-3 w-3" />
                          Valore rivendita
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatPrice(opportunity.estimated_resale_value)}
                        </p>
                      </div>
                    )}
                </div>

                {profit !== null && profit > 0 && (
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600">Profitto stimato</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {Array.isArray(opportunity.images) && opportunity.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {opportunity.images.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setGalleryOpen(true);
                      }}
                      className="flex h-28 min-w-[170px] flex-shrink-0 cursor-zoom-in items-center justify-center rounded-xl bg-gray-100 p-2"
                    >
                      <img
                        src={img}
                        alt={`${opportunity.title}-${index + 1}`}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="pointer-events-none max-h-full max-w-full rounded-lg object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm leading-relaxed text-gray-600">{opportunity.description}</p>

              <div className="flex flex-wrap gap-2">
                {opportunity.user_id !== user?.id && (
  <button
    type="button"
    className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 hover:bg-orange-100"
    onClick={handlePickupRequest}
    disabled={sendingPickup}
    data-testid="open-chat-btn"
  >
    {sendingPickup
      ? 'Apertura...'
      : Number(opportunity.estimated_price) === 0
        ? 'Richiedi ritiro in chat'
        : 'Contatta in chat'}
  </button>
)}

                {opportunity.contact_phone && (
                  <a
                    href={`tel:${opportunity.contact_phone}`}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700 hover:bg-green-100"
                    data-testid="contact-phone-btn"
                  >
                    <Phone className="h-4 w-4" />
                    Chiama
                  </a>
                )}

                {opportunity.contact_email && (
                  <a
                    href={`mailto:${opportunity.contact_email}`}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    data-testid="contact-email-btn"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}

                {opportunity.contact_link && (
                  <a
                    href={opportunity.contact_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    data-testid="contact-link-btn"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apri link
                  </a>
                )}

                {String(opportunity.user_id) === String(user?.id) && (
  <Button
    type="button"
    variant="outline"
    onClick={() => {
      onClose(false);
      navigate(`/opportunities/${opportunity.id}/edit`);
    }}
    className="h-8 rounded-lg border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
  >
    <Edit className="mr-1 h-4 w-4" />
    Modifica
  </Button>
)}

              {String(opportunity.user_id) === String(user?.id) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteOpportunity}
                    className="h-8 rounded-lg border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Elimina
                  </Button>
                )}
              </div>

{(() => {
  const isPremium =
  opportunity.user_profiles?.is_premium === true;

  const hunterLevel =
    authorTrust.score >= 80
      ? 'elite'
      : authorTrust.score >= 40
        ? 'trusted'
        : authorTrust.score >= 15
          ? 'active'
          : 'new';

  const trustProgress = Math.min(authorTrust.score, 100);

  const hunterConfig = {
    elite: {
      label: 'Elite Hunter',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ring: 'ring-yellow-300/50',
      progress: 'bg-yellow-400',
      emoji: '👑',
    },
    trusted: {
      label: 'Trusted Hunter',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      ring: 'ring-emerald-300/50',
      progress: 'bg-emerald-500',
      emoji: '🟢',
    },
    active: {
      label: 'Hunter Attivo',
      badge: 'bg-blue-50 text-blue-700 border-blue-300',
      ring: 'ring-blue-300/50',
      progress: 'bg-blue-500',
      emoji: '🔵',
    },
    new: {
      label: 'Nuovo Hunter',
      badge: 'bg-gray-50 text-gray-600 border-gray-200',
      ring: 'ring-gray-200',
      progress: 'bg-gray-400',
      emoji: '⚪',
    },
  };

  const hunter = hunterConfig[hunterLevel];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ${
        isPremium
          ? 'border-blue-200 shadow-[0_14px_45px_rgba(37,99,235,0.14)]'
          : 'border-gray-200'
      }`}
    >
      {isPremium && (
        <div className="absolute right-3 top-3">
          <div className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
            ✓ Premium
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
  className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 ring-4 ${hunter.ring}`}
>
  {opportunity.avatar_url ? (
    <img
      src={opportunity.avatar_url}
      alt={opportunity.user_name || 'Avatar'}
      className="h-full w-full object-cover"
    />
  ) : (
    <User className="h-6 w-6 text-orange-600" />
  )}
</div>

        <div className="min-w-0 flex-1 pr-16">
          <div className="flex flex-wrap items-center gap-2">
            <button
  type="button"
  onClick={(event) => {
    event.stopPropagation();

    if (opportunity?.user_id) {
      onClose(false);
      navigate(`/users/${opportunity.user_id}`);
    }
  }}
  className="flex items-center gap-1 text-left"
>
  <h3 className="text-base font-black text-gray-900 hover:underline">
    {opportunity.user_name || 'Utente'}

    {opportunity.is_premium && (
      <span
        title="Premium"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
      >
        ✓
      </span>
    )}
  </h3>
</button>

            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${hunter.badge}`}
            >
              <span className="mr-1">{hunter.emoji}</span>
              {hunter.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Membro attivo della community DealRadar
          </p>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-500">Reputazione</span>
              <span className="font-black text-gray-900">
                {authorTrust.score}/100
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${hunter.progress}`}
                style={{ width: `${trustProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gray-50 p-2 text-center">
              <p className="text-[10px] font-medium text-gray-400">Trust</p>
              <p className="text-sm font-black text-gray-900">
                {authorTrust.score}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-2 text-center">
              <p className="text-[10px] font-medium text-gray-400">
                Verificate
              </p>
              <p className="text-sm font-black text-emerald-600">
                {authorTrust.verifiedOpportunities}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-2 text-center">
              <p className="text-[10px] font-medium text-gray-400">Totali</p>
              <p className="text-sm font-black text-blue-600">
                {authorTrust.totalOpportunities}
              </p>
            </div>
          </div>

          {authorTrust.reportsReceived >= 3 && (
            <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-[11px] font-medium text-orange-700">
                ⚠️ Diverse segnalazioni ricevute dalla community
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}

              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MessageCircle className="h-4 w-4" />
                  Commenti ({comments.length})
                </h4>

                <form onSubmit={handleComment} className="mb-1 flex items-center gap-2">
                  <Input
                    placeholder={user ? 'Lascia un commento...' : 'Fai login per commentare'}
                    value={newComment}
                    onChange={(e) => {
                      if (e.target.value.length <= COMMENT_MAX_LENGTH + 50) {
                        setNewComment(e.target.value);
                      }
                    }}
                    disabled={!user || sendingComment}
                    className="h-8 flex-1 rounded-lg text-sm"
                    data-testid="comment-input"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
                    disabled={!canSubmitComment}
                    data-testid="submit-comment-btn"
                  >
                    {sendingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>

                {user && (
                  <div className="mb-2 flex justify-between text-xs">
                    <span
                      className={
                        commentTooShort || commentTooLong ? 'text-red-500' : 'text-gray-400'
                      }
                    >
                      {commentTooShort
                        ? `Minimo ${COMMENT_MIN_LENGTH} caratteri`
                        : commentTooLong
                          ? `Massimo ${COMMENT_MAX_LENGTH} caratteri`
                          : `Min ${COMMENT_MIN_LENGTH} caratteri`}
                    </span>

                    <span
                      className={
                        cleanedComment.length > COMMENT_MAX_LENGTH
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }
                    >
                      {cleanedComment.length}/{COMMENT_MAX_LENGTH}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {loadingComments ? (
                    <p className="py-3 text-center text-sm text-gray-500">
                      Caricamento commenti...
                    </p>
                  ) : comments.length === 0 ? (
                    <p className="py-3 text-center text-sm text-gray-500">
                      Nessun commento ancora
                    </p>
                  ) : (
                    comments.map((comment) => (
  <div
    key={comment.id}
    className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3"
    data-testid={`comment-${comment.id}`}
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10">
        {comment.avatar_url ? (
          <img
            src={comment.avatar_url}
            alt={comment.user_name || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-primary">
            {(comment.user_name || 'U').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <button
  type="button"
  onClick={(event) => {
    event.stopPropagation();

    if (comment?.user_id) {
      onClose(false);
      navigate(`/users/${comment.user_id}`);
    }
  }}
  className="truncate text-left text-sm font-semibold text-gray-900 hover:underline"
>
  {comment.user_name || 'Utente'}
</button>

          {comment.is_premium && (
            <span
              title="Premium"
              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
            >
              ✓
            </span>
          )}

          <span className="text-xs text-gray-400">
            {formatDate(comment.created_at)}
          </span>
        </div>

        <p className="break-words text-sm leading-relaxed text-gray-700">
          {comment.content}
        </p>
      </div>
    </div>
  </div>
))
                  )}
                </div>
              </div>

              <div className="h-2"></div>
            </div>
          </ScrollArea>
        </div>

        {galleryOpen && Array.isArray(opportunity.images) && opportunity.images.length > 0 && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95"
            onClick={() => setGalleryOpen(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGalleryOpen(false);
              }}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {opportunity.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev === 0 ? opportunity.images.length - 1 : prev - 1
                  );
                }}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <div
              className="flex h-full w-full items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={opportunity.images[selectedImageIndex]}
                alt={`${opportunity.title}-${selectedImageIndex + 1}`}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </div>

            {opportunity.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev === opportunity.images.length - 1 ? 0 : prev + 1
                  );
                }}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {opportunity.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                {selectedImageIndex + 1} / {opportunity.images.length}
              </div>
            )}
          </div>
        )}

        {reportOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Segnala contenuto</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Aiutaci a mantenere DealRadar sicuro. Le segnalazioni vengono esaminate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Motivo *
                  </label>

                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-300 px-3"
                  >
                    <option value="">Seleziona motivo</option>
                    {reportReasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Dettagli opzionali
                  </label>

                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    maxLength={500}
                    placeholder="Aggiungi dettagli utili alla verifica..."
                    className="min-h-[120px] w-full rounded-xl border border-gray-300 p-3"
                  />

                  <div className="mt-1 text-xs text-gray-400">
                    {reportDetails.length}/500
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setReportOpen(false)}
                    disabled={sendingReport}
                  >
                    Annulla
                  </Button>

                  <Button
                    type="button"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleReport}
                    disabled={!reportReason || sendingReport}
                  >
                    {sendingReport ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Invio...
                      </>
                    ) : (
                      <>
                        <Flag className="mr-2 h-4 w-4" />
                        Segnala
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;
