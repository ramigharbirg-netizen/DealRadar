import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { opportunitiesAPI, commentsAPI, favoritesAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const categoryConfig = {
  store_liquidation: { name: 'Store Liquidation', color: 'bg-green-500' },
  product_stock: { name: 'Product Stock', color: 'bg-amber-500' },
  equipment: { name: 'Equipment', color: 'bg-blue-500' },
  business_sale: { name: 'Business Sale', color: 'bg-purple-500' },
  auctions: { name: 'Auctions', color: 'bg-red-500' },
  user_reported: { name: 'User Reported', color: 'bg-orange-500' },
  free_deals: { name: 'Free Deals', color: 'bg-green-600' },
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} meters away`;
  return `${km.toFixed(1)} km away`;
};

export const OpportunityDetail = ({ opportunity, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  console.log("USER:", user);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [trustStats, setTrustStats] = useState({
    confirmations: opportunity?.confirmations || 0,
    reports: opportunity?.reports || 0,
  });
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [sendingPickup, setSendingPickup] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const category = categoryConfig[opportunity?.category] || categoryConfig.user_reported;
  const profit =
    opportunity?.estimated_resale_value !== null &&
    opportunity?.estimated_resale_value !== undefined &&
    opportunity?.estimated_price !== null &&
    opportunity?.estimated_price !== undefined
      ? opportunity.estimated_resale_value - opportunity.estimated_price
      : null;

  useEffect(() => {
    const loadData = async () => {
      if (!opportunity?.id || !open) return;

      try {
        const commentsRes = await commentsAPI.get(opportunity.id);
        setComments(commentsRes.data || []);
      } catch (err) {
        console.error('Error loading comments:', err);
      }

      if (user) {
        try {
          const favRes = await favoritesAPI.getAll();
          setIsFavorite((favRes.data || []).some((fav) => fav.id === opportunity.id));
        } catch (err) {
          console.error('Error checking favorite:', err);
        }
      } else {
        setIsFavorite(false);
      }

      setTrustStats({
        confirmations: opportunity?.confirmations || 0,
        reports: opportunity?.reports || 0,
      });
    };

    loadData();
  }, [opportunity?.id, open, user, opportunity?.confirmations, opportunity?.reports]);

  const handleTrust = async (action) => {
    if (!user) {
      toast.error('Please login to verify deals');
      return;
    }

    setLoadingTrust(true);
    try {
      const res = await opportunitiesAPI.trust(opportunity.id, action);
      setTrustStats(res.data);
      toast.success(action === 'confirm' ? 'Deal confirmed' : 'Reported');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setLoadingTrust(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Please login to save deals');
      return;
    }

    try {
      if (isFavorite) {
        await favoritesAPI.remove(opportunity.id);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await favoritesAPI.add(opportunity.id);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const res = await commentsAPI.create(opportunity.id, newComment);
      setComments([res.data, ...comments]);
      setNewComment('');
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: opportunity.title,
          text: opportunity.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      } catch (err) {
        toast.error('Could not copy link');
      }
    }
  };

  const handlePickupRequest = async () => {
  const activeUser = user || {
    id: null,
    email: 'manual@dealradar.app',
    name: 'Manual User',
  };

  setSendingPickup(true);

  try {
    const { error: pickupError } = await supabase
      .from('pickup_requests')
      .insert([
        {
          opportunity_id: opportunity.id,
          requester_name: activeUser.name || activeUser.email,
          requester_email: activeUser.email,
          owner_name: opportunity.user_name,
          owner_email: null,
          status: 'pending',
        },
      ]);

    if (pickupError) throw pickupError;

    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .insert([
        {
          opportunity_id: opportunity.id,
          requester_id: activeUser.id,
          owner_id: opportunity.user_id || null,
        },
      ])
      .select()
      .single();

    if (convError) throw convError;

    await supabase.from('conversation_messages').insert([
      {
        conversation_id: conversationData.id,
        sender_name: activeUser.name,
        sender_email: activeUser.email,
        message: 'Ciao, sono interessato al ritiro. Quando sarebbe possibile passare?',
      },
    ]);

    toast.success('Richiesta inviata + chat aperta 🚀');
    onClose(false);
    navigate(`/chats/${conversationData.id}`);
  } catch (err) {
    console.error(err);
    toast.error('Errore invio richiesta');
  } finally {
    setSendingPickup(false);
  }
};
  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[82vh] w-full sm:max-w-2xl mx-auto p-0 rounded-t-3xl"
        data-testid="opportunity-detail-sheet"
      >
        <ScrollArea className="h-full">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-gray-100"
                onClick={() => onClose(false)}
                data-testid="close-detail-btn"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-2">
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
                  data-testid="favorite-btn"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className={`${category.color} text-white border-0`}>
                  {category.name}
                </Badge>

                {opportunity.is_high_value && (
                  <Badge className="bg-yellow-400 text-yellow-900 border-0">
                    <Star className="w-3 h-3 mr-1" />
                    High Value
                  </Badge>
                )}

                {opportunity.estimated_price === 0 && (
                  <Badge className="bg-green-500 text-white border-0">
                    FREE
                  </Badge>
                )}
              </div>

              <SheetHeader className="text-left p-0 space-y-1">
                <SheetTitle className="text-lg font-bold text-gray-900 leading-tight">
                  {opportunity.title}
                </SheetTitle>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {opportunity.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {opportunity.address}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(opportunity.created_at)}
                  </span>
                </div>

                {opportunity.distance_km !== undefined && (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5 w-fit">
                    <Navigation className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {formatDistance(opportunity.distance_km)}
                    </span>
                  </div>
                )}
              </SheetHeader>
            </div>
          </div>

          <div className="p-4 space-y-3 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    Price
                  </p>

                  {opportunity.estimated_price === 0 ? (
                    <span className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                      FREE
                    </span>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(opportunity.estimated_price) || 'Contact'}
                    </p>
                  )}
                </div>

                {opportunity.estimated_resale_value !== null &&
                  opportunity.estimated_resale_value !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        Resale
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatPrice(opportunity.estimated_resale_value)}
                      </p>
                    </div>
                  )}
              </div>

              {profit && profit > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 font-medium">Estimated Profit</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-bold text-green-600">
                        {formatPrice(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {opportunity.images?.length > 0 && (
  <div className="flex gap-2 overflow-x-auto pb-2">
    {opportunity.images.map((img, index) => (
      <div
        key={index}
        onClick={() => {
          setSelectedImageIndex(index);
          setGalleryOpen(true);
        }}
        className="h-40 min-w-[220px] bg-gray-100 rounded-xl p-2 flex items-center justify-center flex-shrink-0 cursor-zoom-in"
      >
        <img
          src={img}
          alt={`${opportunity.title}-${index + 1}`}
          className="max-h-full max-w-full object-contain rounded-lg pointer-events-none"
        />
      </div>
    ))}
  </div>
)}

            <p className="text-sm text-gray-600 leading-relaxed">
              {opportunity.description}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTrust('confirm')}
                disabled={loadingTrust}
                className="h-8 px-3 rounded-lg border border-green-200 bg-white text-green-700 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-green-50 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  {trustStats.confirmations}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTrust('report')}
                disabled={loadingTrust}
                className="h-8 px-3 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                Report
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                  {trustStats.reports}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {opportunity.contact_phone && (
                <a
                  href={`tel:${opportunity.contact_phone}`}
                  className="h-8 px-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-green-100"
                  data-testid="contact-phone-btn"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}

              {opportunity.contact_email && (
                <a
                  href={`mailto:${opportunity.contact_email}`}
                  className="h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-blue-100"
                  data-testid="contact-email-btn"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              )}

              {opportunity.contact_link && (
                <a
                  href={opportunity.contact_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-gray-100"
                  data-testid="contact-link-btn"
                >
                  <ExternalLink className="w-4 h-4" />
                  External Link
                </a>
              )}
            </div>

            {opportunity.estimated_price === 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-8 px-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-orange-100 disabled:opacity-50"
                  onClick={handlePickupRequest}
                  disabled={sendingPickup}
                  data-testid="request-pickup-btn"
                >
                  Richiedi ritiro
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{opportunity.user_name}</p>
                <p className="text-xs text-gray-500">Posted this deal</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Commenti ({comments.length})
              </h4>

              <form onSubmit={handleComment} className="flex gap-2 mb-2 items-center">
                <Input
                  placeholder={user ? 'Lascia un commento...' : 'Fai login per commentare'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user}
                  className="flex-1 h-8 rounded-lg text-sm"
                  data-testid="comment-input"
                />
                <button
                  type="submit"
                  className="h-8 w-8 rounded-lg bg-primary text-white inline-flex items-center justify-center disabled:opacity-50"
                  disabled={!user || !newComment.trim()}
                  data-testid="submit-comment-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-2.5 bg-gray-50 rounded-lg"
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs text-gray-900">
                          {comment.user_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

                        <div className="h-12"></div>
          </div>
        </ScrollArea>

        {galleryOpen && opportunity.images?.length > 0 && (
  <div
    className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center"
    onClick={() => setGalleryOpen(false)}
  >
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setGalleryOpen(false);
      }}
      className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
    >
      <X className="w-5 h-5" />
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
        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    )}

    <div
      className="w-full h-full flex items-center justify-center p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={opportunity.images[selectedImageIndex]}
        alt={`${opportunity.title}-${selectedImageIndex + 1}`}
        className="max-w-full max-h-full object-contain rounded-xl"
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
        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    )}

    {opportunity.images.length > 1 && (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-white/10 px-3 py-1 rounded-full">
        {selectedImageIndex + 1} / {opportunity.images.length}
      </div>
    )}
  </div>
)}
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;