import { supabase } from './supabase';

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

export const saveConsent = async ({ consent }) => {
  const fullConsent = {
    ...DEFAULT_CONSENT,
    ...consent,
    necessary: true,
    consent_version: CONSENT_VERSION,
    privacy_version: PRIVACY_VERSION,
    terms_version: TERMS_VERSION,
    saved_at: new Date().toISOString(),
  };

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Consent session lookup error:', sessionError);
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(SAVE_CONSENT_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: getSessionId(),
      consent: {
        necessary: true,
        analytics: Boolean(fullConsent.analytics),
        marketing: Boolean(fullConsent.marketing),
        geolocation: Boolean(fullConsent.geolocation),
      },
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

  localStorage.setItem('dealradar_consent', JSON.stringify(fullConsent));
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
