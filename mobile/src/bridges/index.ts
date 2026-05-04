/**
 * Mobile bridges — public API surface for Capacitor native plugins.
 *
 * Import from here, not from individual files, to keep the interface stable
 * as underlying plugins evolve.
 *
 * Example:
 *   import { getHealthData, registerForPushNotifications, getAppVersion } from 'mobile/src/bridges';
 */

// Health (HealthKit + Health Connect)
export {
  requestHealthPermissions,
  getHealthData,
  writeHealthData,
  type HealthDataType,
  type HealthSample,
  type HealthQueryOptions,
} from './health';

// Push Notifications (APNS + FCM)
export {
  registerForPushNotifications,
  onPushReceived,
  onPushActionPerformed,
  getPendingNotifications,
  clearAllNotifications,
  type PushCallback,
  type PushActionCallback,
} from './push';

// Apple Sign In (iOS only)
export {
  signInWithApple,
  type AppleSignInResult,
} from './appleSignIn';

// App version / platform detection
export {
  getAppVersion,
  getAppVersionInfo,
  isNativeApp,
  getPlatform,
  type AppVersionInfo,
} from './appVersion';
