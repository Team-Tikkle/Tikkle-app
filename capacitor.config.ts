import type { CapacitorConfig } from '@capacitor/cli'
import { config as loadEnv } from 'dotenv'

// Load .env so VITE_* variables are accessible in this Node context.
// capacitor.config.ts is executed by the Capacitor CLI (Node), not Vite,
// so import.meta.env is not available here.
loadEnv()

const capacitorConfig: CapacitorConfig = {
  appId: 'com.tikkle.app',
  appName: 'Tikkle',
  webDir: 'dist',
  plugins: {
    // @codetrix-studio/capacitor-google-auth
    // Native Google Sign-In for Android/iOS — replaces the browser GSI popup flow
    // which does not work inside a Capacitor WebView.
    GoogleAuth: {
      // The Web Client ID from Google Cloud Console (OAuth 2.0 credentials).
      // Same value as VITE_GOOGLE_CLIENT_ID used by the web GSI flow.
      scopes: ['openid', 'profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID ?? '',
      // grantOfflineAccess=true causes the Android SDK to also request a
      // server auth code alongside the access token.
      forceCodeForRefreshToken: true,
    },
  },
}

export default capacitorConfig
