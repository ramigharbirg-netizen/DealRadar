import React from 'react';
import { Target, MapPin, Euro, Clock, Users, Navigation } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

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

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
};

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export const BountyCard = ({ bounty, onClick }) => {
  const category = categoryConfig[bounty.category] || categoryConfig.user_reported;

  return (
    <Card
      className="overflow-hidden cursor-pointer border-2 border-dashed border-amber-300 hover:border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 transition-all"
      onClick={onClick}
      data-testid={`bounty-card-${bounty.id}`}
    >
      <CardContent className="p-4">
        {/* Header with Target Icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-100 text-xs">
                BOUNTY
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Reward</p>
            <p className="text-xl font-bold text-amber-600">
              {formatPrice(bounty.reward_amount)}
            </p>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 line-clamp-2 mb-2">
          {bounty.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {bounty.description}
        </p>

        {/* Category Badge */}
        <Badge className={`${category.color} text-white border-0 mb-3`}>
          Looking for: {category.name}
        </Badge>

        {/* Budget */}
        {bounty.max_price && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-white/60 rounded-lg">
            <Euro className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              Budget: up to {formatPrice(bounty.max_price)}
            </span>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-amber-200">
          <div className="flex items-center gap-3">
            {bounty.distance_km !== undefined && (
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <Navigation className="w-3.5 h-3.5" />
                {formatDistance(bounty.distance_km)} radius
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(bounty.created_at)}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {bounty.submissions_count || 0} submissions
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BountyCard;
