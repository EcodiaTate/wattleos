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

          // OAuth callback via custom scheme: au.ecodia.wattleos://auth/callback?code=...
          // Fired after SFSafariViewController (iOS) or Chrome Custom Tab (Android) closes.
          // URL parsing: host="auth", pathname="/callback" — check both.
          // Route to the server-side /auth/callback handler which exchanges the code.
          if (
            url.protocol === "au.ecodia.wattleos:" &&
            url.host === "auth" &&
            url.pathname === "/callback"
          ) {
            options.navigate("/auth/callback" + url.search + url.hash);
            return;
          }

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
 * No-op — @capacitor/status-bar removed due to Cap 8 build conflict.
 * Status bar style is handled via Info.plist / capacitor.config.ts static config.
 */
export async function configureStatusBar(_options: {
  isDarkMode: boolean;
}): Promise<void> {
  // intentionally empty
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
