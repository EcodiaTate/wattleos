// capacitor.config.ts
//
// ============================================================
// WattleOS - Capacitor Configuration
// ============================================================
// WHY server.url: WattleOS uses SSR, Server Components, Server
// Actions, and RLS policies. Static export is not viable.
// The native shell loads the hosted app in a WebView while
// Capacitor plugins provide native device access via JS bridge.
// ============================================================

import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "au.wattleos.app",
  appName: "WattleOS",
  webDir: "public", // Fallback only - not used when server.url is set

  server: {
    // In production, this points to the school's subdomain.
    // During development, point to your local Next.js dev server.
    // Override via environment or build-time config.
    url: process.env.CAPACITOR_SERVER_URL || "https://app.wattleos.au",
    cleartext: false, // HTTPS only in production
    allowNavigation: [
      "*.wattleos.au",
      "*.supabase.co",
      "accounts.google.com", // OAuth
      "*.stripe.com", // Billing portal
    ],
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: false, // We control hide after auth check
      backgroundColor: "#FFFBF5", // Warm wattle cream
      showSpinner: false,
      launchShowDuration: 0,
      androidScaleType: "CENTER_CROP",
    },

    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },

    Keyboard: {
      // WHY: Guides type observations on iPad - scroll must follow cursor
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },

    StatusBar: {
      // WHY: Match the warm wattle theme across platforms
      style: "LIGHT", // Dark text on light background
      backgroundColor: "#FFFBF5",
      overlaysWebView: false,
    },

    Camera: {
      // WHY: Observation capture is WattleOS's "reason for being"
      // Default to rear camera for photographing student work
    },

    LocalNotifications: {
      // WHY: Timesheet submission reminders, observation due dates
      smallIcon: "ic_notification",
      iconColor: "#E8A838", // Wattle amber
      sound: "notification.wav",
    },

    Badge: {
      // WHY: Show unread message/notification count on app icon
    },

    ScreenOrientation: {
      // WHY: iPad users need landscape for curriculum tree, phone users stay portrait
    },

    CapacitorHttp: {
      enabled: false, // Use standard fetch - our SSR handles CORS
    },
  },

  ios: {
    scheme: "WattleOS",
    preferredContentMode: "mobile", // iPadOS renders mobile-optimised
    backgroundColor: "#FFFBF5",
    // Scroll behavior for iPad keyboard
    scrollEnabled: true,
  },

  android: {
    backgroundColor: "#FFFBF5",
    allowMixedContent: false,
    // Android-specific WebView settings
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
};

export default config;
