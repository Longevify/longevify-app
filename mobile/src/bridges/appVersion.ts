/**
 * App version bridge — reads native CFBundleShortVersionString (iOS)
 * or versionName (Android) at runtime.
 * Uses @capacitor/app
 */

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface AppVersionInfo {
  /** Semver string, e.g. "1.2.3" */
  version: string;
  /** Build number string, e.g. "42" */
  build: string;
  /** Full string, e.g. "1.2.3 (42)" */
  display: string;
}

/**
 * Returns the app's version info from native metadata.
 * Falls back to "web" when running in browser (Capacitor not initialized).
 */
export async function getAppVersion(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }

  const info = await App.getInfo();
  return info.version;
}

/**
 * Returns full version info including build number.
 */
export async function getAppVersionInfo(): Promise<AppVersionInfo> {
  if (!Capacitor.isNativePlatform()) {
    return { version: 'web', build: '0', display: 'web (0)' };
  }

  const info = await App.getInfo();
  return {
    version: info.version,
    build: info.build,
    display: `${info.version} (${info.build})`,
  };
}

/**
 * Returns true if the app is running as a native binary (not browser).
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns 'ios' | 'android' | 'web'
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
