import { supabase } from './supabase';
import { hasAnalyticsConsent, getSessionId } from './privacy';

export const trackEvent = async ({
  userId = null,
  eventName,
  entityType = null,
  entityId = null,
  category = null,
  city = null,
  country = 'IT',
  metadata = {},
}) => {
  try {
    if (!eventName) return;
    if (!hasAnalyticsConsent()) return;

    await supabase.from('app_events').insert([
      {
        user_id: userId,
        session_id: getSessionId(),
        event_name: eventName,
        entity_type: entityType,
        entity_id: entityId,
        category,
        city,
        country,
        metadata,
      },
    ]);
  } catch (err) {
    console.error('Track event error:', err);
  }
};