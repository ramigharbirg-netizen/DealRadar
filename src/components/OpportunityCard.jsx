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
    <Card
      className={`cursor-pointer rounded-xl border transition-all shadow-sm hover:border-primary/30 ${
        isVerified ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'
      }`}
      onClick={onClick}
      data-testid={`opportunity-card-${opportunity.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {opportunity.images?.[0] ? (
            <img
              src={opportunity.images[0]}
              alt={opportunity.title}
              loading="lazy"
              decoding="async"
              onError={(e) => {
  e.currentTarget.style.display = 'none';
}}
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <div className={`h-7 w-7 rounded-full ${category.color} opacity-20`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                <Badge className={`${category.color} border-0 px-2 py-0.5 text-[10px] text-white`}>
                  {category.name}
                </Badge>

                {isVerified && (
                  <Badge className="border-0 bg-emerald-500 px-2 py-0.5 text-[10px] text-white">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verificata
                  </Badge>
                )}

                {!isVerified && verifiedCount > 0 && (
                  <Badge className="border-0 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    {verifiedCount === 1 ? '1 verifica' : `${verifiedCount} verifiche`}
                  </Badge>
                )}

                {opportunity.is_high_value && (
                  <Badge className="border-0 bg-yellow-400 px-2 py-0.5 text-[10px] text-yellow-900">
                    <Star className="mr-1 h-3 w-3" />
                    Alto valore
                  </Badge>
                )}

                {opportunity.estimated_price === 0 && (
                  <Badge className="border-0 bg-green-500 px-2 py-0.5 text-[10px] text-white">
                    GRATIS
                  </Badge>
                )}
              </div>

              {profitPercent && profitPercent > 0 && (
                <div className="flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  +{profitPercent}%
                </div>
              )}
            </div>

            <h3 className="mb-1 line-clamp-1 text-sm font-bold leading-snug text-gray-900">
              {opportunity.title}
            </h3>

            <div className="mb-2 flex items-center gap-2">
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();

      if (opportunity?.user_id) {
        navigate(`/users/${opportunity.user_id}`);
      }
    }}
    className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:underline"
  >
    {opportunity.avatar_url ? (
      <img
        src={opportunity.avatar_url}
        alt={opportunity.user_name || 'Utente'}
        className="h-5 w-5 rounded-full object-cover"
      />
    ) : (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
        {(opportunity.user_name || 'U').charAt(0).toUpperCase()}
      </div>
    )}

    <span>
      {opportunity.user_name || 'Utente'}
    </span>

    {opportunity.is_premium && (
      <span
        title="Premium"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
      >
        ✓
      </span>
    )}
  </button>
</div>

            <p className="mb-2 line-clamp-2 text-xs leading-snug text-gray-600">
              {opportunity.description}
            </p>

            <div className="mb-2 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-400">Prezzo</p>
                {opportunity.estimated_price === 0 ? (
                  <span className="inline-block rounded-md bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    GRATIS
                  </span>
                ) : (
                  <p className="mt-1 text-sm font-bold leading-none text-gray-900">
                    {formatPrice(opportunity.estimated_price) || 'Contatta'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-400">Rivendita</p>
                <p className="mt-1 text-sm font-bold leading-none text-blue-600">
                  {formatPrice(opportunity.estimated_resale_value) || '-'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400">Profitto</p>
                <p className="mt-1 text-sm font-bold leading-none text-green-600">
                  {profit && profit > 0 ? formatPrice(profit) : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex min-w-0 items-center gap-3">
                {opportunity.distance_km !== undefined && (
                  <span className="flex items-center gap-1 whitespace-nowrap font-medium text-primary">
                    <Navigation className="h-3 w-3" />
                    {formatDistance(opportunity.distance_km)}
                  </span>
                )}

                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {timeAgo(opportunity.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {verifiedCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-3 w-3" />
                    {verifiedCount}
                  </span>
                )}

                {opportunity.confirmations > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {opportunity.confirmations}
                  </span>
                )}

                {opportunity.reports > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="h-3 w-3" />
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

export default React.memo(OpportunityCard);