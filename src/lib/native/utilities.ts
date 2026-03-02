// src/lib/native/utilities.ts
//
// ============================================================
// WattleOS - Native Utility Plugins
// ============================================================
// Smaller plugin wrappers that don't warrant their own file.
// Each function gracefully falls back to web APIs or no-ops.
// ============================================================

import { Share } from "@capacitor/share";
import { Badge } from "@capawesome/capacitor-badge";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import type { OrientationLockType } from "@capacitor/screen-orientation";
import { Device } from "@capacitor/device";
import { Clipboard } from "@capacitor/clipboard";
import { Browser } from "@capacitor/browser";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { isNative, isPluginAvailable, isIPad } from "./platform";

// ============================================================
// SHARE - Portfolio items, report cards, observation links
// ============================================================

export async function shareContent(options: {
  title: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Native path
  if (isNative() && isPluginAvailable("Share")) {
    try {
      await Share.share(options);
      return true;
    } catch {
      return false; // User cancelled
    }
  }

  // Web fallback (Web Share API)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(options);
      return true;
    } catch {
      return false;
    }
  }

  // Final fallback: copy URL to clipboard
  if (options.url) {
    await copyToClipboard(options.url);
    return true;
  }

  return false;
}

// ============================================================
// BADGE - Unread notification count on app icon
// ============================================================

export async function setBadgeCount(count: number): Promise<void> {
  if (!isNative() || !isPluginAvailable("Badge")) return;

  try {
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch {
    // Silent - badge is cosmetic
  }
}

export async function clearBadge(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Badge")) return;

  try {
    await Badge.clear();
  } catch {
    // Silent
  }
}

// ============================================================
// SCREEN ORIENTATION - iPad landscape, phone portrait lock
// ============================================================

export async function initScreenOrientation(): Promise<void> {
  if (!isNative() || !isPluginAvailable("ScreenOrientation")) return;

  try {
    if (isIPad()) {
      // iPads: allow all orientations
      await ScreenOrientation.unlock();
    } else {
      // Phones: lock to portrait for consistent UX
      await ScreenOrientation.lock({
        orientation: "portrait" satisfies OrientationLockType,
      });
    }
  } catch {
    // Silent
  }
}

export async function lockLandscape(): Promise<void> {
  if (!isNative() || !isPluginAvailable("ScreenOrientation")) return;

  try {
    await ScreenOrientation.lock({
      orientation: "landscape" satisfies OrientationLockType,
    });
  } catch {
    // Silent
  }
}

export async function unlockOrientation(): Promise<void> {
  if (!isNative() || !isPluginAvailable("ScreenOrientation")) return;

  try {
    await ScreenOrientation.unlock();
  } catch {
    // Silent
  }
}

// ============================================================
// DEVICE - Info for support tickets and bug reports
// ============================================================

export interface WattleDeviceInfo {
  model: string;
  platform: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
}

export async function getDeviceInfo(): Promise<WattleDeviceInfo | null> {
  if (!isNative() || !isPluginAvailable("Device")) return null;

  try {
    const info = await Device.getInfo();
    return {
      model: info.model,
      platform: info.platform,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
      webViewVersion: info.webViewVersion,
    };
  } catch {
    return null;
  }
}

// ============================================================
// CLIPBOARD - Copy student IDs, invite links, enrollment codes
// ============================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  // Native path
  if (isNative() && isPluginAvailable("Clipboard")) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch {
      return false;
    }
  }

  // Web fallback
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function readFromClipboard(): Promise<string | null> {
  if (isNative() && isPluginAvailable("Clipboard")) {
    try {
      const result = await Clipboard.read();
      return result.value ?? null;
    } catch {
      return null;
    }
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

// ============================================================
// BROWSER - Open external links (Xero, Stripe, docs) in-app
// ============================================================

export async function openInAppBrowser(url: string): Promise<void> {
  if (isNative() && isPluginAvailable("Browser")) {
    try {
      await Browser.open({
        url,
        presentationStyle: "popover", // iPad: shows as popover
        toolbarColor: "#FFFBF5", // Wattle cream
      });
      return;
    } catch {
      // Fall through to web
    }
  }

  // Web fallback
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function closeInAppBrowser(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Browser")) return;

  try {
    await Browser.close();
  } catch {
    // Silent
  }
}

// ============================================================
// ACTION SHEET - Quick actions on observations, students
// ============================================================

export interface ActionSheetOption {
  title: string;
  style?: "default" | "destructive" | "cancel";
}

export async function showActionSheet(options: {
  title: string;
  message?: string;
  actions: ActionSheetOption[];
}): Promise<number> {
  // Native path
  if (isNative() && isPluginAvailable("ActionSheet")) {
    const STYLE_MAP: Record<string, ActionSheetButtonStyle> = {
      default: ActionSheetButtonStyle.Default,
      destructive: ActionSheetButtonStyle.Destructive,
      cancel: ActionSheetButtonStyle.Cancel,
    };

    try {
      const result = await ActionSheet.showActions({
        title: options.title,
        message: options.message,
        options: options.actions.map((a) => ({
          title: a.title,
          style: STYLE_MAP[a.style ?? "default"],
        })),
      });
      return result.index;
    } catch {
      return -1; // Cancelled
    }
  }

  // Web fallback: return -1 (caller should use custom UI)
  return -1;
}
