export const PRIVACY_VERSION = '1.0';
export const TERMS_VERSION = '1.0';
export const CONSENT_VERSION = '1.0';

const SAVE_CONSENT_FUNCTION_URL =
  'https://vwvliyxrlzxkmdbrmtns.functions.supabase.co/save-consent';

export const DEFAULT_CONSENT = {
  necessary: true,
  analytics: false,
  marketing: false,
  geolocation: false,
};

const createSafeId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getSessionId = () => {
  let sessionId = localStorage.getItem('dealradar_session_id');

  if (!sessionId) {
    sessionId = createSafeId();
    localStorage.setItem('dealradar_session_id', sessionId);
  }

  return sessionId;
};

export const getStoredConsent = () => {
  try {
    const raw = localStorage.getItem('dealradar_consent');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = () => {
  const consent = getStoredConsent();
  return Boolean(consent?.analytics);
};

export const hasMarketingConsent = () => {
  const consent = getStoredConsent();
  return Boolean(consent?.marketing);
};

export const saveConsent = async ({ consent, user = null }) => {
  const fullConsent = {
    ...DEFAULT_CONSENT,
    ...consent,
    necessary: true,
    consent_version: CONSENT_VERSION,
    privacy_version: PRIVACY_VERSION,
    terms_version: TERMS_VERSION,
    saved_at: new Date().toISOString(),
  };

  localStorage.setItem('dealradar_consent', JSON.stringify(fullConsent));

  const response = await fetch(SAVE_CONSENT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: user?.id || null,
      session_id: getSessionId(),
      consent: fullConsent,
      consent_version: CONSENT_VERSION,
      privacy_version: PRIVACY_VERSION,
      terms_version: TERMS_VERSION,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Save consent error:', errorText);
    throw new Error('Errore durante il salvataggio del consenso');
  }

  window.dispatchEvent(new Event('dealradar-consent-updated'));

  return fullConsent;
};

export const anonymizeIp = (ip) => {
  if (!ip) return null;

  if (ip.includes('.')) {
    return ip.replace(/\.\d+$/, '.0');
  }

  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::';
  }

  return null;
};