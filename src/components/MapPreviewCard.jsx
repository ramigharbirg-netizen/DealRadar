import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { getCategoryById } from '../data/categories';
import {
  formatOpportunityPrice,
  isExplicitlyFreeOpportunity,
} from '../utils/opportunityPricing';
import {
  getContentTypeConfig,
  inferOpportunityContentType,
} from '../data/contentTypeCatalog';

const formatDistance = (value) => {
  const distance = Number(value);

  if (!Number.isFinite(distance) || distance < 0) return null;
  if (distance < 1) return `${Math.round(distance * 1000)} m`;

  return `${distance.toFixed(1)} km`;
};

export const MapPreviewCard = ({ opportunity, onViewDetails }) => {
  if (!opportunity) return null;

  const categoryData = getCategoryById(opportunity.category);
  const categoryName =
    categoryData?.shortName || categoryData?.name || 'Altra categoria';

  const contentType = inferOpportunityContentType(opportunity);
  const typeConfig = getContentTypeConfig(contentType);
  const TypeIcon = typeConfig.icon;

  const isDeal = contentType === 'deal';
  const isJobOffer = contentType === 'job';
  const displayedPrice = formatOpportunityPrice(opportunity);
  const isExplicitlyFree = isExplicitlyFreeOpportunity(opportunity);
  const shouldShowPrice =
    !isDeal && !isJobOffer && displayedPrice !== null;

  const estimatedValue =
    !isDeal &&
    !isJobOffer &&
    !isExplicitlyFree &&
    opportunity.estimated_resale_value !== null &&
    opportunity.estimated_resale_value !== undefined &&
    Number.isFinite(Number(opportunity.estimated_resale_value)) &&
    Number(opportunity.estimated_resale_value) > 0
      ? Number(opportunity.estimated_resale_value)
      : null;

  const distance = formatDistance(opportunity.distance_km);
  const firstImage =
  opportunity.thumbnail_url ||
  opportunity.images?.[0] ||
  null;

  return (
    <article
      className="flex w-[270px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[18px] border border-white/70 bg-white shadow-[0_12px_35px_rgba(57,34,15,0.22)] sm:w-[310px]"
      data-testid={`map-preview-${opportunity.id}`}
    >
      <div
        className={`relative h-[112px] w-[92px] flex-shrink-0 overflow-hidden sm:w-[102px] ${typeConfig.softChipColor}`}
      >
        {firstImage ? (
          <img
            src={firstImage}
            alt={opportunity.title || 'Opportunità'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeIcon className={`h-7 w-7 ${typeConfig.softTextColor}`} />
          </div>
        )}

        <div
          className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-br-[14px] text-white shadow-sm"
          style={{ backgroundColor: typeConfig.color }}
        >
          <TypeIcon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-[14px] font-extrabold leading-tight text-gray-900">
              {opportunity.title || 'Opportunità'}
            </h4>

            {distance && (
              <div
                className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${typeConfig.softTextColor}`}
              >
                <Navigation className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{distance}</span>
              </div>
            )}
          </div>

          <div className="flex max-w-[98px] flex-shrink-0 flex-col items-end gap-1">
            <span
              className={`${typeConfig.chipColor} rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white`}
            >
              {typeConfig.label}
            </span>

            <span
              className={`${typeConfig.softChipColor} ${typeConfig.softTextColor} ${typeConfig.borderColor} max-w-[98px] truncate rounded-full border px-2 py-0.5 text-[8px] font-bold`}
            >
              {categoryName}
            </span>
          </div>
        </div>

        {shouldShowPrice && (
          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                Prezzo
              </p>

              <p
                className={`truncate text-[18px] font-extrabold leading-none ${
                  isExplicitlyFree ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {displayedPrice}
              </p>
            </div>

            {estimatedValue !== null && (
              <div className="min-w-0 text-right">
                <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                  Valore stimato
                </p>

                <p className="truncate text-[14px] font-extrabold leading-none text-gray-700">
                  {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(estimatedValue)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onViewDetails}
            className="h-8 rounded-[10px] px-4 text-[11px] font-bold text-white shadow-sm transition active:scale-95"
            style={{ backgroundColor: typeConfig.color }}
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