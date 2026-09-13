import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is a WebView shell that loads the deployed IronTrack site.
// Set IRONTRACK_URL to your live Vercel URL before building the APK.
const RAW_URL = process.env.IRONTRACK_URL || 'android-apk-pipeline-pwa.vercel.app';
const APP_URL = RAW_URL.startsWith('http') ? RAW_URL : `https://${RAW_URL}`;

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