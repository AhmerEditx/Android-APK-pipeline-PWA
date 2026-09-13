import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is a WebView shell that loads the deployed IronTrack site.
// Set IRONTRACK_URL to your live Vercel URL before building the APK.
const APP_URL = process.env.IRONTRACK_URL || 'https://iron-track.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.irontrack.app',
  appName: 'IronTrack',
  webDir: 'public',
  server: {
    url: APP_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;