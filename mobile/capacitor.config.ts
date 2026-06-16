import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.longevify.app',
  appName: 'Longevify',
  // www/ is a placeholder — the actual app is served from server.url (remote URL).
  // Capacitor requires a valid webDir even when using a remote URL.
  webDir: 'www',
  server: {
    url: isProd ? 'https://app.longevify.com.br' : 'http://localhost:3000',
    cleartext: false,
    allowNavigation: [
      'app.longevify.com.br',
      '*.longevify.com.br',
    ],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0d2818',
      showSpinner: false,
      fadeOutDuration: 300,
      launchAutoHide: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0d2818',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    scheme: 'Longevify',
    contentInset: 'always',
    // HealthKit entitlement added via Xcode project (see mobile/ios/App/App.entitlements)
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
