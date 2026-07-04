import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useNavigate } from 'react-router-dom';

const categoryConfig = {
  store_liquidation: { name: 'Liquidazione negozio', color: 'bg-green-500' },
  product_stock: { name: 'Stock prodotti', color: 'bg-amber-500' },
  equipment: { name: 'Attrezzatura', color: 'bg-blue-500' },
  business_sale: { name: 'Vendita attività', color: 'bg-purple-500' },
  electronics: { name: 'Elettronica', color: 'bg-cyan-500' },
  clothing: { name: 'Abbigliamento', color: 'bg-pink-500' },
  home: { name: 'Casa e arredamento', color: 'bg-teal-500' },
  vehicles: { name: 'Motori', color: 'bg-slate-600' },
  other: { name: 'Altro', color: 'bg-gray-500' },
  auctions: { name: 'Aste', color: 'bg-red-500' },
  user_reported: { name: 'Segnalazione utente', color: 'bg-orange-500' },
  free_deals: { name: 'Gratis', color: 'bg-green-600' },
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return null;

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'ora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} g`;

  return date.toLocaleDateString('it-IT');
};

export const OpportunityCard = ({ opportunity, onClick, compact = false }) => { 
  const navigate = useNavigate();

  const category =
    categoryConfig[opportunity.category] || categoryConfig.user_reported;

  const verifiedCount = Number(opportunity.verified_count || 0);
  const isVerified = opportunity.is_verified === true;

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
        className="cursor-pointer p-2.5 transition-colors hover:bg-gray-50"
        data-testid={`opportunity-card-compact-${opportunity.id}`}
      >
        <div className="flex gap-2.5">
          {opportunity.images?.[0] ? (
            <img
              src={opportunity.images[0]}
              alt={opportunity.title}
              loading="lazy"
              decoding="async"
              onError={(e) => {
  e.currentTarget.style.display = 'none';
}}
              className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <div className={`h-6 w-6 rounded-full ${category.color} opacity-20`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h4 className="truncate text-sm font-semibold text-gray-900">
                {opportunity.title}
              </h4>

              {isVerified && (
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              )}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${category.color}`} />
              <span className="truncate text-xs text-gray-500">{category.name}</span>
            </div>

            {verifiedCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                {verifiedCount === 1 ? '1 verifica' : `${verifiedCount} verifiche`}
              </p>
            )}

            <div className="mt-1">
              {opportunity.estimated_price === 0 ? (
                <span className="inline-block rounded-md bg-green-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  GRATIS
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
  <div
    onClick={onClick}
    className="cursor-pointer border-b border-gray-100 bg-white px-3 py-2 transition-colors hover:bg-gray-50"
    data-testid={`opportunity-card-${opportunity.id}`}
  >
    <div className="flex gap-3">
      {opportunity.images?.[0] ? (
        <img
          src={opportunity.images[0]}
          alt={opportunity.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          className="h-[72px] w-[72px] flex-shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <div className={`h-8 w-8 rounded-full ${category.color} opacity-20`} />
        </div>
      )}

      <div className="min-w-0 flex-1 leading-tight">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Badge className={`${category.color} border-0 px-2 py-0.5 text-[10px] font-bold text-white`}>
            {category.name}
          </Badge>

          {profitPercent && profitPercent > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap text-[11px] font-black text-green-600">
              <TrendingUp className="h-3 w-3" />
              +{profitPercent}%
            </div>
          )}
        </div>

        <h3 className="line-clamp-1 text-[14px] font-black leading-tight text-gray-950">
          {opportunity.title}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-gray-500">
  {opportunity.address || 'Zona non specificata'}
</p>

<div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
  {opportunity.estimated_price === 0 ? (
    <p className="text-[15px] font-black text-green-600">
      Gratis
    </p>
  ) : (
    <p className="text-[15px] font-black text-gray-950">
      {formatPrice(opportunity.estimated_price) || '—'}
    </p>
  )}

  {opportunity.distance_km !== undefined && (
    <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
      <Navigation className="h-3 w-3" />
      {formatDistance(opportunity.distance_km)}
    </div>
  )}
</div>

          <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {timeAgo(opportunity.created_at)}
            </span>

            {verifiedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-3 w-3" />
                {verifiedCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default React.memo(OpportunityCard);