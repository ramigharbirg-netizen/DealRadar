import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Mail, ExternalLink, TrendingUp, Clock, 
  CheckCircle, AlertTriangle, Heart, MessageCircle, Send,
  ChevronLeft, Share2, User, Navigation, Star, Euro
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { opportunitiesAPI, commentsAPI, favoritesAPI } from '../lib/api';
import { toast } from 'sonner';

const categoryConfig = {
  store_liquidation: { name: 'Store Liquidation', color: 'bg-green-500' },
  product_stock: { name: 'Product Stock', color: 'bg-amber-500' },
  equipment: { name: 'Equipment', color: 'bg-blue-500' },
  business_sale: { name: 'Business Sale', color: 'bg-purple-500' },
  auctions: { name: 'Auctions', color: 'bg-red-500' },
  user_reported: { name: 'User Reported', color: 'bg-orange-500' },
};

const formatPrice = (price) => {
  if (!price) return null;
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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [trustStats, setTrustStats] = useState({
    confirmations: opportunity?.confirmations || 0,
    reports: opportunity?.reports || 0,
  });
  const [loading, setLoading] = useState(false);

  const category = categoryConfig[opportunity?.category] || categoryConfig.user_reported;
  const profit = opportunity?.estimated_resale_value && opportunity?.estimated_price
    ? opportunity.estimated_resale_value - opportunity.estimated_price
    : null;

  useEffect(() => {
    if (opportunity?.id && open) {
      loadComments();
      checkFavorite();
    }
  }, [opportunity?.id, open]);

  const loadComments = async () => {
    try {
      const res = await commentsAPI.get(opportunity.id);
      setComments(res.data);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;
    try {
      const res = await favoritesAPI.getAll();
      setIsFavorite(res.data.some(fav => fav.id === opportunity.id));
    } catch (err) {
      console.error('Error checking favorite:', err);
    }
  };

  const handleTrust = async (action) => {
    if (!user) {
      toast.error('Please login to verify deals');
      return;
    }
    
    setLoading(true);
    try {
      const res = await opportunitiesAPI.trust(opportunity.id, action);
      setTrustStats(res.data);
      toast.success(action === 'confirm' ? 'Deal confirmed! +10 points for the reporter' : 'Reported as inaccurate');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
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
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 rounded-t-3xl"
        data-testid="opportunity-detail-sheet"
      >
        <ScrollArea className="h-full">
          {/* Header Image */}
          <div className="relative">
            {opportunity.images?.[0] ? (
              <img
                src={opportunity.images[0]}
                alt={opportunity.title}
                className="w-full h-56 object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full ${category.color} opacity-20`}></div>
              </div>
            )}
            
            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm"
                onClick={() => onClose(false)}
                data-testid="close-detail-btn"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm"
                  onClick={handleShare}
                  data-testid="share-btn"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-full backdrop-blur-sm ${
                    isFavorite ? 'bg-red-500 text-white' : 'bg-white/90'
                  }`}
                  onClick={handleFavorite}
                  data-testid="favorite-btn"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Category Badge */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Badge className={`${category.color} text-white border-0`}>
                {category.name}
              </Badge>
              {opportunity.is_high_value && (
                <Badge className="bg-yellow-400 text-yellow-900 border-0">
                  <Star className="w-3 h-3 mr-1" />
                  High Value
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            <SheetHeader className="text-left p-0 space-y-2">
              <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                {opportunity.title}
              </SheetTitle>
              
              {/* Distance - Prominent */}
              {opportunity.distance_km !== undefined && (
                <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2 w-fit">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="text-base font-bold text-primary">
                    {formatDistance(opportunity.distance_km)}
                  </span>
                </div>
              )}

              {/* Location & Date */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
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
            </SheetHeader>

            {/* Price & Profit Box - Euro */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    Purchase Price
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(opportunity.estimated_price) || 'Contact'}
                  </p>
                </div>
                {opportunity.estimated_resale_value && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      Resale Value
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPrice(opportunity.estimated_resale_value)}
                    </p>
                  </div>
                )}
              </div>
              {profit && profit > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 font-medium">Estimated Profit</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-gray-600 leading-relaxed">{opportunity.description}</p>
            </div>

            {/* Trust System */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Verify this deal</h4>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-green-200 hover:bg-green-50 hover:border-green-300"
                  onClick={() => handleTrust('confirm')}
                  disabled={loading}
                  data-testid="confirm-opportunity-btn"
                >
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  <span className="text-green-700">Confirm</span>
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                    {trustStats.confirmations}
                  </Badge>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleTrust('report')}
                  disabled={loading}
                  data-testid="report-opportunity-btn"
                >
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                  <span className="text-red-600">Report</span>
                  <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                    {trustStats.reports}
                  </Badge>
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Help the community by verifying if this deal is real
              </p>
            </div>

            {/* Contact Buttons */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Contact Seller</h4>
              <div className="grid grid-cols-2 gap-3">
                {opportunity.contact_phone && (
                  <a
                    href={`tel:${opportunity.contact_phone}`}
                    className="contact-btn contact-btn-phone"
                    data-testid="contact-phone-btn"
                  >
                    <Phone className="w-5 h-5" />
                    Call
                  </a>
                )}
                {opportunity.contact_email && (
                  <a
                    href={`mailto:${opportunity.contact_email}`}
                    className="contact-btn contact-btn-email"
                    data-testid="contact-email-btn"
                  >
                    <Mail className="w-5 h-5" />
                    Email
                  </a>
                )}
                {opportunity.contact_link && (
                  <a
                    href={opportunity.contact_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn contact-btn-link col-span-2"
                    data-testid="contact-link-btn"
                  >
                    <ExternalLink className="w-5 h-5" />
                    External Link
                  </a>
                )}
              </div>
            </div>

            {/* Posted By */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{opportunity.user_name}</p>
                <p className="text-sm text-gray-500">Posted this deal</p>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Comments ({comments.length})
              </h4>
              
              {/* Comment Form */}
              <form onSubmit={handleComment} className="flex gap-2 mb-4">
                <Input
                  placeholder={user ? "Add a comment..." : "Login to comment"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user}
                  className="flex-1 h-11 rounded-xl"
                  data-testid="comment-input"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-primary"
                  disabled={!user || !newComment.trim()}
                  data-testid="submit-comment-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-gray-50 rounded-xl"
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
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

            {/* Bottom Padding */}
            <div className="h-20"></div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;
