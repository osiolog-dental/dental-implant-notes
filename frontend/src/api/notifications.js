import client from './client';

/**
 * Register an FCM device token with the backend.
 * @param {string} fcmToken - The FCM registration token
 * @param {string} platform - 'web' | 'android' | 'ios'
 */
export const registerDeviceToken = (fcmToken, platform = 'web') =>
  client.post('/api/notifications/device-token', { fcm_token: fcmToken, platform });

/**
 * Unregister an FCM device token on logout.
 * @param {string} fcmToken - The FCM registration token to remove
 */
export const unregisterDeviceToken = (fcmToken) =>
  client.delete(`/api/notifications/device-token?fcm_token=${encodeURIComponent(fcmToken)}`);
