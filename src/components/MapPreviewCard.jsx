import React from 'react';
import { MapPin, TrendingUp, Navigation, Euro } from 'lucide-react';
import { Button } from './ui/button';

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
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)} km away`;
};

export const MapPreviewCard = ({ opportunity, onViewDetails, onClose }) => {
  const category = categoryConfig[opportunity?.category] || categoryConfig.user_reported;
  const profit = opportunity?.estimated_resale_value && opportunity?.estimated_price
    ? opportunity.estimated_resale_value - opportunity.estimated_price
    : null;
  const profitPercent = profit && opportunity?.estimated_price
    ? Math.round((profit / opportunity.estimated_price) * 100)
    : null;

  if (!opportunity) return null;

  return (
    <div 
      className="w-[280px] bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in"
      data-testid={`map-preview-${opportunity.id}`}
    >
      {/* Image */}
      <div className="relative">
        {opportunity.images?.[0] ? (
          <img
            src={opportunity.images[0]}
            alt={opportunity.title}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className={`w-full h-32 ${category.color} opacity-20 flex items-center justify-center`}>
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${category.color}`}>
            {category.name}
          </span>
        </div>

        {/* Profit badge */}
        {profitPercent && profitPercent > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-400 text-white">
              <TrendingUp className="w-3 h-3" />
              +{profitPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">
          {opportunity.title}
        </h4>

        {/* Distance - Prominent */}
        {opportunity.distance_km !== undefined && (
          <div className="flex items-center gap-1.5 mb-2">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {formatDistance(opportunity.distance_km)}
            </span>
          </div>
        )}

        {/* Price Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(opportunity.estimated_price) || 'Contact'}
            </p>
          </div>
          {profit && profit > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Est. Profit</p>
              <p className="text-lg font-bold text-green-600">
                {formatPrice(profit)}
              </p>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <Button
          onClick={onViewDetails}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm"
          data-testid="view-details-btn"
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default MapPreviewCard;
