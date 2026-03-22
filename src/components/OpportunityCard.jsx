import React from 'react';
import { MapPin, TrendingUp, Clock, CheckCircle, AlertTriangle, Navigation, Star } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

// Updated category config with new colors
const categoryConfig = {
  store_liquidation: { name: 'Store Liquidation', color: 'bg-green-500', textColor: 'text-green-500' },
  product_stock: { name: 'Product Stock', color: 'bg-amber-500', textColor: 'text-amber-500' },
  equipment: { name: 'Equipment', color: 'bg-blue-500', textColor: 'text-blue-500' },
  business_sale: { name: 'Business Sale', color: 'bg-purple-500', textColor: 'text-purple-500' },
  auctions: { name: 'Auctions', color: 'bg-red-500', textColor: 'text-red-500' },
  user_reported: { name: 'User Reported', color: 'bg-orange-500', textColor: 'text-orange-500' },
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

export const OpportunityCard = ({ opportunity, onClick, compact = false }) => {
  const category = categoryConfig[opportunity.category] || categoryConfig.user_reported;
  const profit = opportunity.estimated_resale_value && opportunity.estimated_price
    ? opportunity.estimated_resale_value - opportunity.estimated_price
    : null;
  const profitPercent = profit && opportunity.estimated_price
    ? Math.round((profit / opportunity.estimated_price) * 100)
    : null;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        data-testid={`opportunity-card-compact-${opportunity.id}`}
      >
        <div className="flex gap-3">
          {opportunity.images?.[0] && (
            <img
              src={opportunity.images[0]}
              alt={opportunity.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">{opportunity.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${category.color}`}></span>
              <span className="text-xs text-gray-500">{category.name}</span>
            </div>
            {opportunity.estimated_price && (
              <p className="text-sm font-bold text-primary mt-1">
                {formatPrice(opportunity.estimated_price)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
  <Card
    className="overflow-hidden cursor-pointer border border-gray-100 hover:border-primary/30 transition-all"
    onClick={onClick}
    data-testid={`opportunity-card-${opportunity.id}`}
  >
    <CardContent className="p-3">
      <div className="flex gap-3">
        {/* Small visual */}
        {opportunity.images?.[0] ? (
          <img
            src={opportunity.images[0]}
            alt={opportunity.title}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <div className={`w-10 h-10 rounded-full ${category.color} opacity-20`}></div>
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex flex-wrap gap-1">
              <Badge className={`${category.color} text-white border-0 text-[10px] px-2 py-0.5`}>
                {category.name}
              </Badge>
              {opportunity.is_high_value && (
                <Badge className="bg-yellow-400 text-yellow-900 border-0 text-[10px] px-2 py-0.5">
                  <Star className="w-3 h-3 mr-1" />
                  High Value
                </Badge>
              )}
            </div>

            {profitPercent && profitPercent > 0 && (
              <div className="text-[11px] font-bold text-green-600 flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="w-3 h-3" />
                +{profitPercent}%
              </div>
            )}
          </div>

          <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">
            {opportunity.title}
          </h3>

          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {opportunity.description}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <div>
  <p className="text-[10px] text-gray-500">Price</p>

  {opportunity.estimated_price === 0 ? (
    <span className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
      FREE
    </span>
  ) : (
    <p className="text-sm font-bold text-gray-900">
      {formatPrice(opportunity.estimated_price) || 'Contact'}
    </p>
  )}
</div>

            <div>
              <p className="text-[10px] text-gray-500">Resale</p>
              <p className="text-sm font-bold text-blue-600">
                {formatPrice(opportunity.estimated_resale_value) || '-'}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500">Profit</p>
              <p className="text-sm font-bold text-green-600">
                {profit && profit > 0 ? formatPrice(profit) : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-3 min-w-0">
              {opportunity.distance_km !== undefined && (
                <span className="flex items-center gap-1 text-primary font-semibold whitespace-nowrap">
                  <Navigation className="w-3 h-3" />
                  {formatDistance(opportunity.distance_km)}
                </span>
              )}

              <span className="flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {timeAgo(opportunity.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {opportunity.confirmations > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  {opportunity.confirmations}
                </span>
              )}
              {opportunity.reports > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-3 h-3" />
                  {opportunity.reports}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
};

export default OpportunityCard;
