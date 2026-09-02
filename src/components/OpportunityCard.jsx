import React from 'react';
import {
  Clock,
  Navigation,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { getCategoryById } from '../data/categories';
import {
  formatOpportunityPrice,
  isExplicitlyFreeOpportunity,
} from '../utils/opportunityPricing';
import {
  getContentTypeConfig,
  inferOpportunityContentType,
} from '../data/contentTypeCatalog';
import { getOpportunityExpirySummary } from '../utils/opportunityLifecycle';

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;

  const numericDistance = Number(km);
  if (!Number.isFinite(numericDistance) || numericDistance < 0) return null;

  if (numericDistance < 1) {
    return `${Math.round(numericDistance * 1000)} m`;
  }

  return `${numericDistance.toFixed(1)} km`;
};

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return 'ora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} g`;

  return date.toLocaleDateString('it-IT');
};

export const OpportunityCard = ({
  opportunity,
  onClick,
  compact = false,
}) => {
  const categoryFromCatalog = getCategoryById(opportunity.category);
  const categoryName =
    categoryFromCatalog?.shortName ||
    categoryFromCatalog?.name ||
    'Altra categoria';

  const contentType = inferOpportunityContentType(opportunity);
  const typeConfig = getContentTypeConfig(contentType);
  const TypeIcon = typeConfig.icon;

  const previewImage =
    opportunity.thumbnail_url ||
    opportunity.images?.[0] ||
    null;

  const verifiedCount = Number(opportunity.verified_count || 0);
  const isVerified = opportunity.is_verified === true;
  const isDeal = contentType === 'deal';
  const isJobOffer = contentType === 'job';
  const expirySummary = getOpportunityExpirySummary(opportunity);
  const expiryMs = opportunity.expires_at
    ? new Date(opportunity.expires_at).getTime() - Date.now()
    : null;
  const showExpiryBadge =
    expirySummary &&
    (expirySummary.expired ||
      (Number.isFinite(expiryMs) && expiryMs <= 7 * 24 * 60 * 60 * 1000));

  const displayedPrice = formatOpportunityPrice(opportunity);
  const isExplicitlyFree = isExplicitlyFreeOpportunity(opportunity);
  const shouldShowPrice =
    !isDeal && !isJobOffer && displayedPrice !== null;

  const hasResaleValue =
    !isDeal &&
    !isJobOffer &&
    !isExplicitlyFree &&
    opportunity.estimated_resale_value !== null &&
    opportunity.estimated_resale_value !== undefined &&
    Number.isFinite(Number(opportunity.estimated_resale_value)) &&
    Number(opportunity.estimated_resale_value) > 0;

  const badges = (
    <div className="flex min-w-0 items-center gap-1.5">
      <Badge
        className={`${typeConfig.chipColor} flex-shrink-0 border-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white`}
      >
        <TypeIcon className="mr-1 h-3 w-3" />
        {typeConfig.label}
      </Badge>

      <Badge
        variant="outline"
        className={`${typeConfig.softChipColor} ${typeConfig.softTextColor} ${typeConfig.borderColor} min-w-0 max-w-[150px] truncate px-2 py-0.5 text-[9px] font-bold`}
      >
        {categoryName}
      </Badge>

      {showExpiryBadge && (
        <Badge
          variant="outline"
          className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-bold ${
            expirySummary.expired
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          }`}
        >
          <Clock className="mr-1 h-3 w-3" />
          {expirySummary.label}
        </Badge>
      )}
    </div>
  );

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer p-2.5 transition-colors hover:bg-gray-50"
        data-testid={`opportunity-card-compact-${opportunity.id}`}
      >
        <div className="flex gap-2.5">
          {previewImage ? (
            <img
              src={previewImage}
              alt={opportunity.title}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg ${typeConfig.softChipColor}`}
            >
              <TypeIcon className={`h-6 w-6 ${typeConfig.softTextColor}`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {badges}

            <div className="mt-1.5 flex items-center gap-1">
              <h4 className="truncate text-sm font-semibold text-gray-900">
                {opportunity.title}
              </h4>

              {isVerified && (
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              )}
            </div>

            {verifiedCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                {verifiedCount === 1
                  ? '1 verifica'
                  : `${verifiedCount} verifiche`}
              </p>
            )}

            {shouldShowPrice && (
              <p
                className={`mt-1 text-sm font-bold ${
                  isExplicitlyFree ? 'text-green-600' : 'text-gray-950'
                }`}
              >
                {displayedPrice}
              </p>
            )}

            {hasResaleValue && (
              <p className="mt-1 text-[11px] font-medium text-gray-500">
                Valore stimato:{' '}
                {new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(Number(opportunity.estimated_resale_value))}
              </p>
            )}
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
        {previewImage ? (
          <img
            src={previewImage}
            alt={opportunity.title}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="h-[72px] w-[72px] flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl ${typeConfig.softChipColor}`}
          >
            <TypeIcon className={`h-8 w-8 ${typeConfig.softTextColor}`} />
          </div>
        )}

        <div className="min-w-0 flex-1 leading-tight">
          {badges}

          <h3 className="mt-1 line-clamp-1 text-[14px] font-black leading-tight text-gray-950">
            {opportunity.title}
          </h3>

          <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-gray-500">
            {opportunity.address || 'Zona non specificata'}
          </p>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {shouldShowPrice && (
                  <p
                    className={`text-[15px] font-black ${
                      isExplicitlyFree ? 'text-green-600' : 'text-gray-950'
                    }`}
                  >
                    {displayedPrice}
                  </p>
                )}

                {opportunity.distance_km !== undefined &&
                  formatDistance(opportunity.distance_km) && (
                    <div
                      className={`flex items-center gap-1 text-[11px] font-bold ${typeConfig.softTextColor}`}
                    >
                      <Navigation className="h-3 w-3" />
                      {formatDistance(opportunity.distance_km)}
                    </div>
                  )}
              </div>

              {hasResaleValue && (
                <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                  Valore stimato:{' '}
                  {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(Number(opportunity.estimated_resale_value))}
                </p>
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