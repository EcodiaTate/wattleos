// src/lib/native/scheduled.ts
//
// ============================================================
// WattleOS - Local Notifications & Geolocation
// ============================================================
// Local Notifications: Scheduled reminders that don't need a
// server push - timesheet submission deadlines, observation
// review dates, upcoming parent conferences.
//
// Geolocation: Excursion tracking for off-site safety.
// ============================================================

import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";
import { Geolocation, type Position } from "@capacitor/geolocation";
import { isNative, isPluginAvailable } from "./platform";

// ============================================================
// LOCAL NOTIFICATIONS
// ============================================================

/**
 * Schedule a local notification.
 * WHY: Remind guides to submit timesheets by Friday 3pm,
 * or notify that observation reviews are due.
 */
export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  /** When to fire - ISO date string or Date object */
  scheduledAt: Date;
  /** Deep link path when tapped */
  route?: string;
}): Promise<boolean> {
  if (!isNative() || !isPluginAvailable("LocalNotifications")) return false;

  try {
    // Check permission
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") return false;

    const notification: LocalNotificationSchema = {
      id: options.id,
      title: options.title,
      body: options.body,
      schedule: { at: options.scheduledAt },
      sound: "notification.wav",
      smallIcon: "ic_notification",
      iconColor: "#E8A838",
      extra: options.route ? { route: options.route } : undefined,
    };

    await LocalNotifications.schedule({ notifications: [notification] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel a specific scheduled notification.
 */
export async function cancelNotification(id: number): Promise<void> {
  if (!isNative() || !isPluginAvailable("LocalNotifications")) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // Silent
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!isNative() || !isPluginAvailable("LocalNotifications")) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    // Silent
  }
}

/**
 * Schedule a recurring timesheet reminder.
 * WHY: Staff forget to submit timesheets. A Friday 3pm nudge
 * catches them before the weekend.
 */
export async function scheduleTimesheetReminder(): Promise<boolean> {
  // Schedule for next Friday at 3pm
  const now = new Date();
  const friday = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(15, 0, 0, 0);

  // If it's already past Friday 3pm, schedule for next week
  if (friday <= now) {
    friday.setDate(friday.getDate() + 7);
  }

  return scheduleNotification({
    id: 9001, // Reserved ID for timesheet reminders
    title: "Timesheet Reminder",
    body: "Don't forget to submit your timesheet before the end of the day.",
    scheduledAt: friday,
    route: "/admin/timesheets",
  });
}

// ============================================================
// GEOLOCATION
// ============================================================

export interface WattleLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number; // Unix ms
}

/**
 * Get current location.
 * WHY: Excursion tracking - know where the group is for safety.
 */
export async function getCurrentLocation(): Promise<WattleLocation | null> {
  // Native path
  if (isNative() && isPluginAvailable("Geolocation")) {
    try {
      let perm = await Geolocation.checkPermissions();
      if (perm.location === "prompt") {
        perm = await Geolocation.requestPermissions();
      }
      if (perm.location !== "granted") return null;

      const pos: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
    } catch {
      return null;
    }
  }

  // Web fallback
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  return null;
}

/**
 * Watch location changes (for live excursion tracking).
 * Returns an unsubscribe function.
 */
export function watchLocation(
  callback: (location: WattleLocation) => void,
  errorCallback?: (error: string) => void,
): () => void {
  // Native path
  if (isNative() && isPluginAvailable("Geolocation")) {
    let watchId: string | null = null;

    Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
      if (err) {
        errorCallback?.(err.message);
        return;
      }
      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      }
    }).then((id) => {
      watchId = id;
    });

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }

  // Web fallback
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        callback({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => errorCallback?.(err.message),
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(id);
  }

  return () => {};
}
