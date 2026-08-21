import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

const CHAT_NOTIFICATION_CHANNEL_ID = 'chat_messages';
const OPPORTUNITY_NOTIFICATION_CHANNEL_ID = 'opportunity_updates';

export const registerPushNotifications = async (userId) => {
  if (!userId) return;
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push permission not granted');
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: CHAT_NOTIFICATION_CHANNEL_ID,
        name: 'Messaggi chat',
        description: 'Notifiche per i nuovi messaggi ricevuti in chat',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });


      await PushNotifications.createChannel({
        id: OPPORTUNITY_NOTIFICATION_CHANNEL_ID,
        name: 'Scadenze opportunità',
        description: 'Promemoria per opportunità e annunci in scadenza',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      const pushToken = token.value;

      if (!pushToken) return;

      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            token: pushToken,
            platform: 'android',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (error) {
        console.error('Save push token error:', error);
      } else {
        console.log('Push token saved');
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });
  } catch (error) {
    console.error('Push setup error:', error);
  }
};