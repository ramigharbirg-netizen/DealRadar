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
import { supabase } from '../lib/supabase';
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

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US');

export const OpportunityDetail = ({ opportunity, open, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const category = categoryConfig[opportunity?.category] || categoryConfig.user_reported;

  useEffect(() => {
    if (!opportunity) return;

    commentsAPI.get(opportunity.id).then(res => setComments(res.data));
  }, [opportunity]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment) return;

    const res = await commentsAPI.create(opportunity.id, newComment);
    setComments([res.data, ...comments]);
    setNewComment('');
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-2xl">

        <ScrollArea className="h-full">

          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
            <Button variant="ghost" size="icon" onClick={() => onClose(false)}>
              <ChevronLeft />
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Share2 />
              </Button>
              <Button variant="ghost" size="icon">
                <Heart />
              </Button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-4 space-y-3">

            {/* TITLE */}
            <div>
              <Badge className={`${category.color} text-white mb-1`}>
                {category.name}
              </Badge>

              <h2 className="font-bold text-lg">{opportunity.title}</h2>

              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {opportunity.address}
              </p>
            </div>

            {/* IMAGE */}
            {opportunity.images?.[0] && (
              <img
                src={opportunity.images[0]}
                className="w-full h-28 object-cover rounded-xl"
              />
            )}

            {/* PRICE BOX */}
            <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm">
              <div>
                <p className="text-gray-500 text-xs">Price</p>
                {opportunity.estimated_price === 0 ? (
                  <span className="bg-green-500 text-white px-2 py-0.5 rounded-md text-xs font-bold">
                    FREE
                  </span>
                ) : (
                  <p className="font-bold">
                    {formatPrice(opportunity.estimated_price)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-gray-500 text-xs">Resale</p>
                <p className="font-bold text-blue-600">
                  {formatPrice(opportunity.estimated_resale_value)}
                </p>
              </div>
            </div>

            {/* DESCRIPTION */}
            <p className="text-sm text-gray-600">
              {opportunity.description}
            </p>

            {/* TRUST */}
            <div className="flex gap-2">
              <Button className="flex-1 h-10 text-sm">Confirm</Button>
              <Button className="flex-1 h-10 text-sm">Report</Button>
            </div>

            {/* CONTACT */}
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-10 text-sm">Call</Button>
              <Button className="h-10 text-sm">Email</Button>
            </div>

            {/* FREE PICKUP */}
            {opportunity.estimated_price === 0 && (
              <Button
                className="h-10 w-full bg-green-500 text-white text-sm"
                onClick={async () => {
                  if (!user) {
                    toast.error('Fai login prima');
                    return;
                  }

                  await supabase.from('pickup_requests').insert([{
                    opportunity_id: opportunity.id,
                    requester_name: user.email,
                    requester_email: user.email,
                    owner_name: opportunity.user_name,
                    owner_email: null,
                  }]);

                  toast.success('Richiesta inviata!');
                }}
              >
                Richiedi ritiro
              </Button>
            )}

            {/* COMMENTS */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Commenti</h4>

              <form onSubmit={handleComment} className="flex gap-2 mb-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="h-10 text-sm"
                />
                <Button type="submit" size="icon" className="h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="text-sm bg-gray-50 p-2 rounded">
                    <p className="font-medium">{c.user_name}</p>
                    <p>{c.content}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;