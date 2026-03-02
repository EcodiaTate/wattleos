// src/lib/native/platform.ts
//
// ============================================================
// WattleOS - Platform Detection
// ============================================================
// WHY: The same codebase runs in browser (desktop), iPad Safari,
// and Capacitor native shell. We need to know which context
// we're in to choose web APIs vs native Capacitor plugins.
// ============================================================

import { Capacitor } from "@capacitor/core";

export type WattlePlatform = "ios" | "android" | "web";

/**
 * Returns the current platform. Safe to call on server (returns "web").
 */
export function getPlatform(): WattlePlatform {
  if (typeof window === "undefined") return "web";
  return Capacitor.getPlatform() as WattlePlatform;
}

/**
 * True when running inside the Capacitor native shell (iOS or Android).
 * False in browser, SSR, or PWA.
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/**
 * True when running on an iPad (native or Safari).
 * Useful for layout decisions - iPads get landscape support and
 * larger touch targets.
 */
export function isIPad(): boolean {
  if (typeof window === "undefined") return false;

  // Native iPad
  if (isNative() && getPlatform() === "ios") {
    // Check for iPad via user agent or screen size
    const ua = navigator.userAgent;
    if (ua.includes("iPad")) return true;
    // iPadOS 13+ reports as Mac in UA - check touch support + screen size
    if (ua.includes("Macintosh") && navigator.maxTouchPoints > 1) return true;
    // Fallback: screen width >= 768 on iOS is likely iPad
    return Math.min(screen.width, screen.height) >= 768;
  }

  // Safari iPad (non-native)
  const ua = navigator.userAgent;
  if (ua.includes("iPad")) return true;
  if (ua.includes("Macintosh") && navigator.maxTouchPoints > 1) return true;

  return false;
}

/**
 * True when a specific Capacitor plugin is available.
 * Use this to guard plugin calls gracefully.
 */
export function isPluginAvailable(pluginName: string): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isPluginAvailable(pluginName);
}
