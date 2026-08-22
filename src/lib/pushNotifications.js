import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

const CHAT_NOTIFICATION_CHANNEL_ID = 'chat_messages';
const OPPORTUNITY_NOTIFICATION_CHANNEL_ID = 'opportunity_updates';
const INSTALLATION_ID_STORAGE_KEY = 'dealradar_installation_id';

let listenersInitialized = false;
let nativeRegistrationStarted = false;
let activeUserId = null;
let registrationPromise = null;

const createInstallationId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const getPushInstallationId = () => {
  let installationId = localStorage.getItem(INSTALLATION_ID_STORAGE_KEY);

  if (!installationId) {
    installationId = createInstallationId();
    localStorage.setItem(INSTALLATION_ID_STORAGE_KEY, installationId);
  }

  return installationId;
};

const saveCurrentPushToken = async (pushToken) => {
  if (!pushToken || !activeUserId) return;

  const installationId = getPushInstallationId();

  const { error } = await supabase.rpc('register_push_installation', {
    p_installation_id: installationId,
    p_token: pushToken,
    p_platform: Capacitor.getPlatform() || 'android',
  });

  if (error) {
    console.error('Save push installation error:', error);
  } else {
    console.log('Push installation saved');
  }
};

const ensurePushListeners = async () => {
  if (listenersInitialized) return;
  listenersInitialized = true;

  await PushNotifications.addListener('registration', async (token) => {
    await saveCurrentPushToken(token.value);
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });
};

const ensureAndroidChannels = async () => {
  if (Capacitor.getPlatform() !== 'android') return;

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
};

export const registerPushNotifications = async (userId) => {
  if (!userId) return;
  if (!Capacitor.isNativePlatform()) return;

  const sameUserAlreadyInitialized =
    activeUserId === userId && nativeRegistrationStarted;

  if (sameUserAlreadyInitialized) {
    return;
  }

  const userChanged = Boolean(activeUserId && activeUserId !== userId);
  activeUserId = userId;

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push permission not granted');
        return;
      }

      await ensurePushListeners();
      await ensureAndroidChannels();

      if (!nativeRegistrationStarted || userChanged) {
        nativeRegistrationStarted = true;
        await PushNotifications.register();
      }
    } catch (error) {
      nativeRegistrationStarted = false;
      console.error('Push setup error:', error);
    }
  })();

  try {
    await registrationPromise;
  } finally {
    registrationPromise = null;
  }
};

export const unregisterPushInstallation = async () => {
  if (!Capacitor.isNativePlatform()) {
    activeUserId = null;
    nativeRegistrationStarted = false;
    return;
  }

  const installationId = getPushInstallationId();

  try {
    const { error } = await supabase.rpc('unregister_push_installation', {
      p_installation_id: installationId,
    });

    if (error) {
      console.error('Push installation cleanup error:', error);
    }
  } catch (error) {
    console.error('Push installation cleanup error:', error);
  } finally {
    activeUserId = null;
    nativeRegistrationStarted = false;
  }
};
