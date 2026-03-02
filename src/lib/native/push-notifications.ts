// src/lib/native/push-notifications.ts
//
// ============================================================
// WattleOS - Push Notifications Bridge
// ============================================================
// WHY: Staff need real-time alerts for unexplained absences,
// emergency contacts, parent messages, and admin announcements.
// Native push via APNs (iOS) and FCM (Android) delivers
// reliably even when the app is backgrounded.
//
// Web fallback: Uses the Web Push API + service worker.
// ============================================================

import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from "@capacitor/push-notifications";
import { isNative, isPluginAvailable } from "./platform";

/** Callback types for notification events */
export interface PushNotificationHandlers {
  /** Called when registration succeeds - send token to server */
  onRegistration: (token: string) => void;
  /** Called when registration fails */
  onRegistrationError: (error: string) => void;
  /** Called when a notification is received while app is in foreground */
  onNotificationReceived: (notification: WattleNotification) => void;
  /** Called when user taps a notification - navigate to relevant page */
  onNotificationTapped: (notification: WattleNotification) => void;
}

/** Normalized notification shape for WattleOS */
export interface WattleNotification {
  id: string;
  title: string;
  body: string;
  /** Deep link path within WattleOS (e.g. "/pedagogy/observations/abc123") */
  route: string | null;
  /** Notification category for routing */
  category: WattleNotificationCategory | null;
  /** Additional data payload */
  data: Record<string, string>;
}

export type WattleNotificationCategory =
  | "observation_published"
  | "message_received"
  | "absence_alert"
  | "pickup_request"
  | "report_ready"
  | "timesheet_reminder"
  | "announcement"
  | "emergency";

/**
 * Request permission and register for push notifications.
 * Call this once after the user logs in and we have tenant context.
 *
 * @returns true if permission was granted
 */
export async function registerForPush(
  handlers: PushNotificationHandlers,
): Promise<boolean> {
  if (!isNative() || !isPluginAvailable("PushNotifications")) {
    // Web fallback - could implement Web Push API here
    console.info(
      "[WattleOS] Push notifications not available on this platform",
    );
    return false;
  }

  try {
    // Check/request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("[WattleOS] Push notification permission denied");
      return false;
    }

    // Set up listeners BEFORE registering
    await PushNotifications.addListener("registration", (token: Token) => {
      console.info(
        "[WattleOS] Push token:",
        token.value.substring(0, 20) + "...",
      );
      handlers.onRegistration(token.value);
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.error("[WattleOS] Push registration error:", error);
      handlers.onRegistrationError(error.error);
    });

    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        handlers.onNotificationReceived(normalizeNotification(notification));
      },
    );

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        handlers.onNotificationTapped(
          normalizeNotification(action.notification),
        );
      },
    );

    // Register with APNs/FCM
    await PushNotifications.register();

    return true;
  } catch (err) {
    console.error("[WattleOS] Push registration failed:", err);
    return false;
  }
}

/**
 * Remove all push notification listeners.
 * Call on logout to clean up.
 */
export async function unregisterPush(): Promise<void> {
  if (!isNative() || !isPluginAvailable("PushNotifications")) return;

  try {
    await PushNotifications.removeAllListeners();
  } catch {
    // Silent
  }
}

/**
 * Get the current delivered notifications (badge list).
 * Useful for showing notification count on app resume.
 */
export async function getDeliveredNotifications(): Promise<
  WattleNotification[]
> {
  if (!isNative() || !isPluginAvailable("PushNotifications")) return [];

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications.map(normalizeNotification);
  } catch {
    return [];
  }
}

/**
 * Clear all delivered notifications from the notification center.
 */
export async function clearNotifications(): Promise<void> {
  if (!isNative() || !isPluginAvailable("PushNotifications")) return;

  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch {
    // Silent
  }
}

// ============================================================
// Internal: Normalize Capacitor notification → WattleNotification
// ============================================================

function normalizeNotification(
  raw: PushNotificationSchema,
): WattleNotification {
  const data = (raw.data ?? {}) as Record<string, string>;

  return {
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title ?? "",
    body: raw.body ?? "",
    route: data.route ?? null,
    category: (data.category as WattleNotificationCategory) ?? null,
    data,
  };
}
