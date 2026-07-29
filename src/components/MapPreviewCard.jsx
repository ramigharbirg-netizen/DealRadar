import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { getCategoryById } from '../data/categories';

const formatPrice = (value) => {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDistance = (value) => {
  const distance = Number(value);

  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};

export const MapPreviewCard = ({ opportunity, onViewDetails }) => {
  if (!opportunity) {
    return null;
  }

  const categoryData =
  getCategoryById(opportunity.category) ||
  getCategoryById('user_reported');

const category = {
  name: categoryData?.shortName || categoryData?.name || 'Segnalazione',
  color: categoryData?.chipColor || 'bg-orange-500',
};

  const price = Number(opportunity.estimated_price || 0);
  const isJobOffer = opportunity.category === 'job_offers';

const estimatedValue =
  opportunity.estimated_resale_value !== null &&
  opportunity.estimated_resale_value !== undefined
    ? Number(opportunity.estimated_resale_value)
    : null;

  const distance = formatDistance(opportunity.distance_km);
  const firstImage = opportunity.images?.[0] || null;

  return (
    <article
      className="flex w-[270px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[18px] border border-white/70 bg-white shadow-[0_12px_35px_rgba(57,34,15,0.22)] sm:w-[310px]"
      data-testid={`map-preview-${opportunity.id}`}
    >
      <div className="relative h-[112px] w-[92px] flex-shrink-0 overflow-hidden bg-orange-50 sm:w-[102px]">
        {firstImage ? (
          <img
            src={firstImage}
            alt={opportunity.title || 'Opportunità'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${category.color} bg-opacity-15`}
          >
            <MapPin className="h-7 w-7 text-gray-400" />
          </div>
        )}

        <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-br-[14px] bg-orange-500 text-white shadow-sm">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-[14px] font-extrabold leading-tight text-gray-900">
              {opportunity.title || 'Opportunità'}
            </h4>

            {distance && (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                <Navigation className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{distance}</span>
              </div>
            )}
          </div>

          <span
            className={`max-w-[82px] flex-shrink-0 truncate rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${category.color}`}
          >
            {category.name}
          </span>
        </div>

        {!isJobOffer && (
  <div className="mt-auto flex items-end justify-between gap-2">
    <div className="min-w-0">
      <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
        Prezzo
      </p>

      <p className="truncate text-[18px] font-extrabold leading-none text-gray-900">
        {formatPrice(price) || 'Gratis'}
      </p>
    </div>

    {estimatedValue !== null && (
      <div className="min-w-0 text-right">
        <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
          Valore stimato
        </p>

        <p className="truncate text-[14px] font-extrabold leading-none text-gray-700">
          {formatPrice(estimatedValue)}
        </p>
      </div>
    )}
  </div>
)}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span />

          <button
            type="button"
            onClick={onViewDetails}
            className="h-8 rounded-[10px] bg-orange-500 px-4 text-[11px] font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
            data-testid="view-details-btn"
          >
            Vedi
          </button>
        </div>
      </div>
    </article>
  );
};

export default MapPreviewCard;
