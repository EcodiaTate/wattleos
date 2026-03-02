// src/lib/native/app-lifecycle.ts
//
// ============================================================
// WattleOS - App Lifecycle Bridge
// ============================================================
// WHY: Handles deep links (wattleos.au URLs opening in-app),
// Android back button navigation, splash screen dismissal
// after auth check, and app state (foreground/background) for
// syncing data when the app resumes.
// ============================================================

import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isNative, isPluginAvailable, getPlatform } from "./platform";

/**
 * Initialize app lifecycle handlers.
 * Call once in the root layout's client component.
 *
 * @param navigate - Function to navigate to a route (e.g. router.push)
 * @param onResume - Called when app returns to foreground (sync data)
 */
export async function initAppLifecycle(options: {
  navigate: (path: string) => void;
  onResume?: () => void;
  onPause?: () => void;
}): Promise<() => void> {
  if (!isNative()) {
    return () => {}; // No-op cleanup on web
  }

  const cleanups: Array<{ remove: () => Promise<void> }> = [];

  // ── Deep Links ──
  // WHY: When a parent taps a WattleOS link (e.g. portfolio share),
  // it should open inside the app, not in Safari/Chrome.
  //
  // SECURITY: Whitelist allowed deep-link path prefixes to prevent
  // path traversal or navigation to unexpected internal routes via
  // a crafted wattleos.au URL. Only routes intended to be linked
  // externally (e.g. portfolio share, messages, booking) are allowed.
  const ALLOWED_DEEP_LINK_PREFIXES = [
    "/observations",
    "/students",
    "/interviews",
    "/messages",
    "/attendance",
    "/tours",
    "/inquiry",
    "/enroll",
    "/invite",
    "/my-schedule",
  ];

  if (isPluginAvailable("App")) {
    const deepLinkHandle = await App.addListener(
      "appUrlOpen",
      (event: URLOpenListenerEvent) => {
        try {
          const url = new URL(event.url);

          // Only handle wattleos.au URLs
          if (url.hostname.endsWith("wattleos.au")) {
            const path = url.pathname + url.search;

            // Only navigate to whitelisted path prefixes
            const isAllowed = ALLOWED_DEEP_LINK_PREFIXES.some(
              (prefix) =>
                path === prefix ||
                path.startsWith(prefix + "/") ||
                path.startsWith(prefix + "?"),
            );

            if (isAllowed) {
              options.navigate(path);
            }
          }
        } catch {
          // Invalid URL - ignore
        }
      },
    );
    cleanups.push(deepLinkHandle);

    // ── Android Back Button ──
    if (getPlatform() === "android") {
      const backHandle = await App.addListener("backButton", () => {
        const canGoBack = window.history.length > 1;

        if (canGoBack) {
          window.history.back();
        } else {
          // At root - minimize the app (don't exit)
          App.minimizeApp();
        }
      });
      cleanups.push(backHandle);
    }

    // ── App State (foreground/background) ──
    const stateHandle = await App.addListener("appStateChange", (state) => {
      if (state.isActive) {
        options.onResume?.();
      } else {
        options.onPause?.();
      }
    });
    cleanups.push(stateHandle);
  }

  // Return cleanup function
  return () => {
    cleanups.forEach((h) => h.remove());
  };
}

/**
 * Hide the splash screen.
 * Call after auth check completes and the app is ready to display.
 */
export async function hideSplashScreen(): Promise<void> {
  if (!isNative() || !isPluginAvailable("SplashScreen")) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Silent
  }
}

/**
 * Configure the status bar appearance.
 * Call after theme is determined (light/dark mode).
 */
export async function configureStatusBar(options: {
  isDarkMode: boolean;
}): Promise<void> {
  if (!isNative() || !isPluginAvailable("StatusBar")) return;

  try {
    // Light background → dark text (and vice versa)
    await StatusBar.setStyle({
      style: options.isDarkMode ? Style.Dark : Style.Light,
    });

    if (getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: options.isDarkMode ? "#1C1917" : "#FFFBF5", // Warm dark / warm cream
      });
    }
  } catch {
    // Silent
  }
}

/**
 * Get the app version info.
 * Useful for support screens and bug reports.
 */
export async function getAppInfo(): Promise<{
  version: string;
  build: string;
  id: string;
} | null> {
  if (!isNative() || !isPluginAvailable("App")) return null;

  try {
    const info = await App.getInfo();
    return {
      version: info.version,
      build: info.build,
      id: info.id,
    };
  } catch {
    return null;
  }
}
