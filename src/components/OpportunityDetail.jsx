import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
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
  if (price === null || price === undefined || Number.isNaN(Number(price))) return null;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(price));
};

const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDistance = (km) => {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return null;
  if (Number(km) < 1) return `${Math.round(Number(km) * 1000)} meters away`;
  return `${Number(km).toFixed(1)} km away`;
};

export const OpportunityDetail = ({ opportunity, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [sendingPickup, setSendingPickup] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingFavoriteState, setLoadingFavoriteState] = useState(false);

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

  useEffect(() => {
    if (!opportunity?.id || !open) return;

    let cancelled = false;

    const loadData = async () => {
      setLoadingComments(true);
      setLoadingFavoriteState(true);

      try {
        try {
          const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select('*')
            .eq('opportunity_id', opportunity.id)
            .order('created_at', { ascending: false });

          if (commentsError) throw commentsError;

          if (!cancelled) {
            setComments(Array.isArray(commentsData) ? commentsData : []);
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
        } else {
          if (!cancelled) {
            setIsFavorite(false);
            setLoadingFavoriteState(false);
          }
        }
      } catch (err) {
        console.error('OpportunityDetail loadData error:', err);

        if (!cancelled) {
          setLoadingComments(false);
          setLoadingFavoriteState(false);
        }
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
    }
  }, [open]);

  const handleFavorite = async () => {
    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Please login to save deals');
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
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase.from('favorites').insert([
          {
            user_id: user.id,
            opportunity_id: opportunity.id,
          },
        ]);

        if (error) throw error;

        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (err) {
      console.error('Favorite action failed:', err);
      toast.error('Action failed');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();

    if (!opportunity?.id) return;

    if (!user) {
      toast.error('Please login to comment');
      navigate('/login');
      return;
    }

    const content = newComment.trim();
    if (!content) return;

    try {
      const payload = {
        opportunity_id: opportunity.id,
        user_id: user.id,
        user_name: user.name || user.email || 'User',
        content,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setComments((prev) => [data, ...prev]);
      }

      setNewComment('');
      toast.success('Comment added');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: opportunity?.title || 'DealRadar opportunity',
          text: opportunity?.description || '',
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error('Could not copy link');
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

      const { data: conversationData, error: convError } = await supabase
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

      const { error: messageError } = await supabase.from('conversation_messages').insert([
        {
          conversation_id: conversationData.id,
          sender_name: user.name || user.email,
          sender_email: user.email,
          message: 'Ciao, sono interessato al ritiro. Quando sarebbe possibile passare?',
        },
      ]);

      if (messageError) throw messageError;

      toast.success('Chat aperta 🚀');
      onClose(false);
      navigate(`/chats/${conversationData.id}`);
    } catch (err) {
      console.error('Pickup request error:', err);
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
                  disabled={loadingFavoriteState}
                  data-testid="favorite-btn"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className={`${category.color} border-0 text-white`}>
                  {category.name}
                </Badge>

                {opportunity.is_high_value && (
                  <Badge className="border-0 bg-yellow-400 text-yellow-900">
                    <Star className="mr-1 h-3 w-3" />
                    High Value
                  </Badge>
                )}

                {Number(opportunity.estimated_price) === 0 && (
                  <Badge className="border-0 bg-green-500 text-white">FREE</Badge>
                )}
              </div>

              <SheetHeader className="space-y-1 p-0 text-left">
                <SheetTitle className="leading-tight text-lg font-bold text-gray-900">
                  {opportunity.title}
                </SheetTitle>

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
                      Price
                    </p>

                    {Number(opportunity.estimated_price) === 0 ? (
                      <span className="inline-block rounded-md bg-green-500 px-2 py-1 text-xs font-bold text-white">
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
                        <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                          <Euro className="h-3 w-3" />
                          Resale
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
                      <p className="text-sm font-medium text-gray-600">Estimated Profit</p>
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
                        className="pointer-events-none max-h-full max-w-full rounded-lg object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm leading-relaxed text-gray-600">{opportunity.description}</p>

              <div className="flex flex-wrap gap-2">
                {Number(opportunity.estimated_price) === 0 && (
                  <button
                    type="button"
                    className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                    onClick={handlePickupRequest}
                    disabled={sendingPickup}
                    data-testid="request-pickup-btn"
                  >
                    {sendingPickup ? 'Invio...' : 'Richiedi ritiro'}
                  </button>
                )}

                {opportunity.contact_phone && (
                  <a
                    href={`tel:${opportunity.contact_phone}`}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700 hover:bg-green-100"
                    data-testid="contact-phone-btn"
                  >
                    <Phone className="h-4 w-4" />
                    Call
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
                    External Link
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {opportunity.user_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Posted this deal</p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MessageCircle className="h-4 w-4" />
                  Commenti ({comments.length})
                </h4>

                <form onSubmit={handleComment} className="mb-2 flex items-center gap-2">
                  <Input
                    placeholder={user ? 'Lascia un commento...' : 'Fai login per commentare'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!user}
                    className="h-8 flex-1 rounded-lg text-sm"
                    data-testid="comment-input"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
                    disabled={!user || !newComment.trim()}
                    data-testid="submit-comment-btn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>

                <div className="space-y-2">
                  {loadingComments ? (
                    <p className="py-3 text-center text-sm text-gray-500">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="py-3 text-center text-sm text-gray-500">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg bg-gray-50 p-2.5"
                        data-testid={`comment-${comment.id}`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900">
                            {comment.user_name || 'User'}
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
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;