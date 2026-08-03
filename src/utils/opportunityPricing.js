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
  if (isExplicitlyFreeOpportunity(opportunity)) {
    return 'Gratis';
  }

  const price = getOpportunityPrice(opportunity);

  if (price === null) {
    return null;
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};