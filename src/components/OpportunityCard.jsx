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
      className="opportunity-card overflow-hidden cursor-pointer border border-gray-100 hover:border-primary/30"
      onClick={onClick}
      data-testid={`opportunity-card-${opportunity.id}`}
    >
      {/* Image */}
      {opportunity.images?.[0] ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={opportunity.images[0]}
            alt={opportunity.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`${category.color} text-white border-0`}>
              {category.name}
            </Badge>
          </div>
          {/* Profit Badge */}
          {profitPercent && profitPercent > 0 && (
            <div className="absolute top-3 right-3">
              <div className="profit-badge flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{profitPercent}%
              </div>
            </div>
          )}
          {/* High Value indicator */}
          {opportunity.is_high_value && (
            <div className="absolute bottom-3 right-3">
              <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3" />
                High Value
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[16/10] bg-gray-100 flex items-center justify-center">
          <div className={`w-16 h-16 rounded-full ${category.color} opacity-20`}></div>
        </div>
      )}

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-bold text-gray-900 line-clamp-2 mb-2">
          {opportunity.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {opportunity.description}
        </p>

        {/* Price Info with Euro */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Purchase Price</p>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(opportunity.estimated_price) || 'Contact'}
              </span>
            </div>
            {opportunity.estimated_resale_value && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Resale Value</p>
                <span className="text-lg font-bold text-blue-600">
                  {formatPrice(opportunity.estimated_resale_value)}
                </span>
              </div>
            )}
          </div>
          {profit && profit > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">Estimated Profit</span>
              <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {formatPrice(profit)}
              </span>
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {opportunity.distance_km !== undefined && (
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Navigation className="w-3.5 h-3.5" />
                {formatDistance(opportunity.distance_km)} away
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(opportunity.created_at)}
            </span>
          </div>
          
          {/* Trust indicators */}
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
      </CardContent>
    </Card>
  );
};

export default OpportunityCard;
