import { Capacitor } from '@capacitor/core';
import { registerDeviceToken, unregisterDeviceToken } from '../api/notifications';

let _registeredToken = null;

/**
 * Request push notification permission and register the FCM token with the backend.
 * - On native (Android/iOS): uses @capacitor/push-notifications
 * - On web: uses Firebase JS SDK + service worker
 *
 * Safe to call multiple times — skips if already registered this session.
 */
export async function registerForNotifications() {
  if (_registeredToken) return;

  try {
    if (Capacitor.isNativePlatform()) {
      await _registerNative();
    } else {
      await _registerWeb();
    }
  } catch (err) {
    // Non-fatal — app works fine without push notifications
    console.warn('Push notification registration failed:', err?.message || err);
  }
}

/**
 * Remove the FCM token from the backend on logout.
 */
export async function unregisterNotifications() {
  if (!_registeredToken) return;
  try {
    await unregisterDeviceToken(_registeredToken);
  } catch (_) {
    // Ignore — token will expire on backend eventually
  } finally {
    _registeredToken = null;
  }
}

async function _registerNative() {
  // Phase 9 push notifications is still pending in this project, so the
  // native PushNotifications plugin may not be installed in every dev build.
  // Skip native registration gracefully instead of breaking Android builds.
  if (!Capacitor.isPluginAvailable('PushNotifications')) {
    console.info('PushNotifications plugin not available yet; skipping native registration');
    return;
  }

  const PushNotifications = window.Capacitor?.Plugins?.PushNotifications;
  if (!PushNotifications) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') return;

  await PushNotifications.register();

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('FCM registration timeout')), 10000);

    PushNotifications.addListener('registration', async (token) => {
      clearTimeout(timeout);
      const platform = Capacitor.getPlatform(); // 'android' | 'ios'
      await _sendTokenToBackend(token.value, platform);
      resolve();
    });

    PushNotifications.addListener('registrationError', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function _registerWeb() {
  if (!('Notification' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const { getToken } = await import('firebase/messaging');
  const { getFirebaseMessaging } = await import('./firebase');

  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('REACT_APP_FIREBASE_VAPID_KEY not set — web push disabled');
    return;
  }

  const token = await getToken(messaging, { vapidKey });
  if (token) {
    await _sendTokenToBackend(token, 'web');
  }
}

async function _sendTokenToBackend(fcmToken, platform) {
  await registerDeviceToken(fcmToken, platform);
  _registeredToken = fcmToken;
}
