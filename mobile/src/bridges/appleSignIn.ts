/**
 * Apple Sign In bridge
 *
 * NOTE: Requires @capacitor-community/apple-sign-in (not yet installed).
 * Add it with:  npm install @capacitor-community/apple-sign-in  (inside mobile/)
 * Then: npx cap sync
 *
 * In Xcode, enable "Sign in with Apple" in the Signing & Capabilities tab.
 *
 * On Android this falls back gracefully — Apple Sign In is iOS-only by Apple's TOS,
 * but the package provides a stub so the import doesn't crash.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface AppleSignInResult {
  /** JWT identity token — send this to your backend for verification */
  identityToken: string;
  /** One-time auth code — exchange server-side for refresh token */
  authCode: string;
  /** User's Apple ID (email, may be anonymized by Apple) */
  email?: string;
  /** User's display name (only provided on first sign-in) */
  givenName?: string;
  familyName?: string;
  /** Opaque user ID — stable per Apple ID + team */
  user: string;
}

interface AppleSignInPlugin {
  authorize(options?: {
    clientId?: string;
    redirectURI?: string;
    scopes?: string;
    state?: string;
    nonce?: string;
  }): Promise<{ response: AppleSignInResult }>;
}

const SignInWithApplePlugin = registerPlugin<AppleSignInPlugin>('SignInWithApple', {
  web: () =>
    import('@capacitor-community/apple-sign-in').then(
      (m) => new m.SignInWithAppleWeb(),
    ),
});

/**
 * Trigger Apple Sign In sheet and return credentials.
 * Throws if the user cancels or Sign In with Apple is unavailable.
 *
 * Usage:
 *   const creds = await signInWithApple();
 *   // Send creds.identityToken to /api/auth/apple on your backend
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Capacitor.getPlatform() === 'android') {
    throw new Error(
      'Apple Sign In is not available on Android. Use Google Sign In instead.',
    );
  }

  const { response } = await SignInWithApplePlugin.authorize({
    scopes: 'email name',
  });

  return response;
}
