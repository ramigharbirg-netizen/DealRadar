import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Star,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

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

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
};

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
};

export const OpportunityCard = ({ opportunity, onClick, compact = false }) => {
  const category =
    categoryConfig[opportunity.category] || categoryConfig.user_reported;

  const profit =
    opportunity.estimated_resale_value !== null &&
    opportunity.estimated_resale_value !== undefined &&
    opportunity.estimated_price !== null &&
    opportunity.estimated_price !== undefined
      ? opportunity.estimated_resale_value - opportunity.estimated_price
      : null;

  const profitPercent =
    profit && opportunity.estimated_price
      ? Math.round((profit / opportunity.estimated_price) * 100)
      : null;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="p-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        data-testid={`opportunity-card-compact-${opportunity.id}`}
      >
        <div className="flex gap-2.5">
          {opportunity.images?.[0] ? (
            <img
              src={opportunity.images[0]}
              alt={opportunity.title}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <div className={`w-6 h-6 rounded-full ${category.color} opacity-20`} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">
              {opportunity.title}
            </h4>

            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${category.color}`} />
              <span className="text-xs text-gray-500 truncate">
                {category.name}
              </span>
            </div>

            <div className="mt-1">
              {opportunity.estimated_price === 0 ? (
                <span className="inline-block bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                  FREE
                </span>
              ) : (
                <p className="text-sm font-bold text-primary">
                  {formatPrice(opportunity.estimated_price)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className="cursor-pointer border border-gray-200 hover:border-primary/30 transition-all shadow-sm rounded-xl"
      onClick={onClick}
      data-testid={`opportunity-card-${opportunity.id}`}
    >
      <CardContent className="p-3">
        <div className="flex gap-3 items-start">
          {opportunity.images?.[0] ? (
            <img
              src={opportunity.images[0]}
              alt={opportunity.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full ${category.color} opacity-20`} />
            </div>
          )}

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

                {opportunity.estimated_price === 0 && (
                  <Badge className="bg-green-500 text-white border-0 text-[10px] px-2 py-0.5">
                    FREE
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

            <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-1 mb-1">
              {opportunity.title}
            </h3>

            <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-snug">
              {opportunity.description}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <p className="text-[10px] text-gray-400">Price</p>
                {opportunity.estimated_price === 0 ? (
                  <span className="inline-block bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    FREE
                  </span>
                ) : (
                  <p className="text-sm font-bold text-gray-900 leading-none mt-1">
                    {formatPrice(opportunity.estimated_price) || 'Contact'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-400">Resale</p>
                <p className="text-sm font-bold text-blue-600 leading-none mt-1">
                  {formatPrice(opportunity.estimated_resale_value) || '-'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400">Profit</p>
                <p className="text-sm font-bold text-green-600 leading-none mt-1">
                  {profit && profit > 0 ? formatPrice(profit) : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-3 min-w-0">
                {opportunity.distance_km !== undefined && (
                  <span className="flex items-center gap-1 text-primary font-medium whitespace-nowrap">
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
