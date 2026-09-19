export const isExplicitlyFreeOpportunity = (opportunity) =>
  opportunity?.category === 'free_deals';

export const getOpportunityPrice = (opportunity) => {
  const rawPrice = opportunity?.estimated_price;

  if (
    rawPrice === null ||
    rawPrice === undefined ||
    rawPrice === ''
  ) {
    return null;
  }

  const price = Number(rawPrice);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
};

export const formatOpportunityPrice = (opportunity) => {
  if (isExplicitlyFreeOpportunity(opportunity)) return 'Gratis';

  const price = getOpportunityPrice(opportunity);
  if (price === null) return null;

  const formattedPrice = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);

  if (opportunity?.category !== 'rental_homes') {
    return formattedPrice;
  }

  const rentPeriodLabels = {
    nightly: 'notte',
    daily: 'giorno',
    weekly: 'settimana',
    monthly: 'mese',
    yearly: 'anno',
  };

  const rentPeriodLabel =
    rentPeriodLabels[opportunity?.attributes?.rental_period];

  return rentPeriodLabel
    ? `${formattedPrice} / ${rentPeriodLabel}`
    : formattedPrice;
};