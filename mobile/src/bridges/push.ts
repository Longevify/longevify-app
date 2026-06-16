/**
 * Push notifications bridge — FCM (Android) + APNS (iOS)
 * Uses @capacitor/push-notifications
 */

import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from '@capacitor/push-notifications';

export type PushCallback = (notification: PushNotificationSchema) => void;
export type PushActionCallback = (action: ActionPerformed) => void;

/**
 * Register the device for push notifications.
 * Returns the FCM/APNS token string, or null if permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive !== 'granted') {
    console.warn('[Push] Permission not granted:', permission.receive);
    return null;
  }

  return new Promise((resolve, reject) => {
    // Remove any lingering listeners before adding new ones
    PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', (token: Token) => {
      console.info('[Push] Device token:', token.value);
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
      reject(new Error(err.error));
    });

    PushNotifications.register();
  });
}

/**
 * Register a callback for notifications received while the app is in foreground.
 * Returns a cleanup function — call it to remove the listener.
 */
export function onPushReceived(callback: PushCallback): () => void {
  const listenerRef = PushNotifications.addListener(
    'pushNotificationReceived',
    callback,
  );

  return () => {
    listenerRef.then((l) => l.remove());
  };
}

/**
 * Register a callback for when user taps a notification action.
 * Returns a cleanup function — call it to remove the listener.
 */
export function onPushActionPerformed(callback: PushActionCallback): () => void {
  const listenerRef = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    callback,
  );

  return () => {
    listenerRef.then((l) => l.remove());
  };
}

/**
 * Get all pending (delivered) notifications from the notification center.
 */
export async function getPendingNotifications(): Promise<PushNotificationSchema[]> {
  const { notifications } = await PushNotifications.getDeliveredNotifications();
  return notifications;
}

/**
 * Clear all delivered notifications from the notification center.
 */
export async function clearAllNotifications(): Promise<void> {
  await PushNotifications.removeAllDeliveredNotifications();
}
