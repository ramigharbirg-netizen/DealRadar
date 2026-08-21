export const STANDARD_OPPORTUNITY_LIFETIME_DAYS = 90;
export const OPPORTUNITY_GRACE_PERIOD_DAYS = 30;
export const MAX_DEAL_LIFETIME_DAYS = 90;

export const DEAL_EXPIRY_OPTIONS = [
  { id: '24h', label: '24 ore', hours: 24 },
  { id: '3d', label: '3 giorni', days: 3 },
  { id: '7d', label: '7 giorni', days: 7 },
  { id: '30d', label: '30 giorni', days: 30 },
  { id: 'custom', label: 'Data personalizzata' },
];

const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const toLocalDateTimeInputValue = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';

  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getDefaultDealCustomExpiry = () =>
  toLocalDateTimeInputValue(addDays(new Date(), 7));

export const getDealCustomExpiryBounds = () => ({
  min: toLocalDateTimeInputValue(addHours(new Date(), 1)),
  max: toLocalDateTimeInputValue(addDays(new Date(), MAX_DEAL_LIFETIME_DAYS)),
});

export const resolveDealExpiryIso = (optionId, customValue = '') => {
  const now = new Date();
  const option = DEAL_EXPIRY_OPTIONS.find((item) => item.id === optionId);

  if (!option) {
    throw new Error('Seleziona la durata dell’affare');
  }

  let expiry;

  if (option.id === 'custom') {
    expiry = new Date(customValue);
  } else if (option.hours) {
    expiry = addHours(now, option.hours);
  } else {
    expiry = addDays(now, option.days);
  }

  if (!expiry || Number.isNaN(expiry.getTime())) {
    throw new Error('Data di scadenza non valida');
  }

  const minimum = addHours(now, 1);
  const maximum = addDays(now, MAX_DEAL_LIFETIME_DAYS);

  if (expiry <= minimum) {
    throw new Error('La scadenza deve essere almeno un’ora nel futuro');
  }

  if (expiry > maximum) {
    throw new Error('La scadenza non può superare 90 giorni');
  }

  return expiry.toISOString();
};

export const isOpportunityExpired = (opportunity) => {
  if (!opportunity) return false;
  if (opportunity.lifecycle_status === 'expired') return true;

  if (!opportunity.expires_at) return false;
  const expiry = new Date(opportunity.expires_at).getTime();
  return Number.isFinite(expiry) && expiry <= Date.now();
};

export const isOpportunityPubliclyActive = (opportunity) =>
  Boolean(opportunity) &&
  opportunity.is_hidden !== true &&
  opportunity.lifecycle_status !== 'expired' &&
  (!opportunity.expires_at || new Date(opportunity.expires_at).getTime() > Date.now());

export const getOpportunityExpirySummary = (opportunity) => {
  if (!opportunity?.expires_at) return null;

  const expiry = new Date(opportunity.expires_at);
  if (Number.isNaN(expiry.getTime())) return null;

  const diffMs = expiry.getTime() - Date.now();
  const absoluteDays = Math.ceil(Math.abs(diffMs) / (24 * 60 * 60 * 1000));

  if (diffMs <= 0) {
    return {
      expired: true,
      label: 'Scaduta',
      detail: opportunity.purge_after
        ? `Rinnovabile fino al ${new Date(opportunity.purge_after).toLocaleDateString('it-IT')}`
        : 'Non più visibile pubblicamente',
    };
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
    return { expired: false, label: `Scade tra ${hours} h`, detail: null };
  }

  return {
    expired: false,
    label: `Scade tra ${absoluteDays} g`,
    detail: expiry.toLocaleDateString('it-IT'),
  };
};

export const shouldOfferStandardRenewal = (opportunity) => {
  if (!opportunity || opportunity.content_type === 'deal') return false;
  if (isOpportunityExpired(opportunity)) return true;
  if (!opportunity.expires_at) return false;

  const diff = new Date(opportunity.expires_at).getTime() - Date.now();
  return Number.isFinite(diff) && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
};

export const shouldOfferDealRenewal = (opportunity) => {
  if (!opportunity || opportunity.content_type !== 'deal') return false;
  if (isOpportunityExpired(opportunity)) return true;
  if (!opportunity.expires_at) return false;

  const diff = new Date(opportunity.expires_at).getTime() - Date.now();
  return Number.isFinite(diff) && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
};
