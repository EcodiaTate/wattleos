// src/components/native/NativeInitializer.tsx
//
// ============================================================
// WattleOS - Native Plugin Initializer
// ============================================================
// Client component that bootstraps all Capacitor plugins when
// the app mounts inside the native shell. Safe to render on
// web - all plugin calls are guarded by isNative().
//
// Mount once in the root (app) layout:
//   <NativeInitializer />
// ============================================================

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  isNative,
  initAppLifecycle,
  hideSplashScreen,
  configureStatusBar,
  initKeyboard,
  initScreenOrientation,
  registerForPush,
  setBadgeCount,
  clearNotifications,
  getQueuedObservations,
} from "@/lib/native";

import { registerPushToken } from "@/lib/actions/push-tokens";
import { getPlatform } from "@/lib/native/platform";
import {
  syncQueuedObservations,
  initObservationSync,
} from "@/lib/native/observation-sync";
import { openInAppBrowser } from "@/lib/native/utilities";

export function NativeInitializer() {
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double-init in React strict mode
    if (initialized.current) return;
    if (!isNative()) return;
    initialized.current = true;

    let cleanups: Array<() => void> = [];

    // Intercept target="_blank" / window.open calls so they use the
    // in-app browser (SFSafariViewController / Chrome Custom Tab) instead
    // of handing off to Safari/Chrome externally.
    function interceptExternalLinks(e: MouseEvent) {
      const anchor = (e.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only intercept absolute URLs (http/https) — internal Next.js
      // navigation uses relative paths and should not be intercepted.
      if (!/^https?:\/\//i.test(href)) return;
      e.preventDefault();
      void openInAppBrowser(href);
    }
    document.addEventListener("click", interceptExternalLinks, true);
    cleanups.push(() =>
      document.removeEventListener("click", interceptExternalLinks, true),
    );

    async function bootstrap() {
      // 1. Configure status bar to match wattle theme
      await configureStatusBar({ isDarkMode: false });

      // 2. Initialize keyboard behavior (iPad scroll + Done button)
      const cleanupKeyboard = await initKeyboard();
      cleanups.push(cleanupKeyboard);

      // 3. Set screen orientation (iPad: all, Phone: portrait)
      await initScreenOrientation();

      // 4. Initialize app lifecycle (deep links, back button, resume sync)
      const cleanupLifecycle = await initAppLifecycle({
        navigate: (path) => router.push(path),
        onResume: async () => {
          // Sync queued observations when app comes back to foreground
          const queued = await getQueuedObservations();
          if (queued.length > 0) {
            console.info(
              `[WattleOS] App resumed - syncing ${queued.length} queued observations`,
            );
            const result = await syncQueuedObservations();
            if (result.synced > 0) {
              console.info(`[WattleOS] Synced ${result.synced} observations`);
            }
            if (result.failed > 0) {
              console.warn(
                `[WattleOS] ${result.failed} observations failed to sync`,
                result.errors,
              );
            }
          }

          // Clear notification badge on resume
          await clearNotifications();
          await setBadgeCount(0);
        },
      });
      cleanups.push(cleanupLifecycle);

      // 5. Register for push notifications
      await registerForPush({
        onRegistration: async (token) => {
          // Persist token to server for this user + tenant
          const platform = getPlatform();
          await registerPushToken(token, platform);
          console.info("[WattleOS] Push token registered");
        },
        onRegistrationError: (error) => {
          console.warn("[WattleOS] Push registration failed:", error);
        },
        onNotificationReceived: (notification) => {
          // Foreground notification - could show an in-app toast
          console.info("[WattleOS] Notification received:", notification.title);
        },
        onNotificationTapped: (notification) => {
          // User tapped notification - navigate to relevant page
          if (notification.route) {
            router.push(notification.route);
          }
        },
      });

      // 6. Auto-sync observations when network comes back online
      const cleanupSync = initObservationSync();
      cleanups.push(cleanupSync);

      // 7. Hide splash screen - app is ready
      await hideSplashScreen();
    }

    bootstrap();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  // This component renders nothing - it's a side-effect initializer
  return null;
}
