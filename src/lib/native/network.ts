// src/lib/native/network.ts
//
// ============================================================
// WattleOS - Network Detection Bridge
// ============================================================
// WHY: Montessori classrooms aren't always near the router.
// Guides need to capture observations even with spotty WiFi.
// This module detects connectivity changes so the app can:
// 1. Queue observations for later upload
// 2. Show an offline indicator in the UI
// 3. Sync drafts when connection returns
// ============================================================

import { Network, type ConnectionStatus } from "@capacitor/network";
import { isNative, isPluginAvailable } from "./platform";

export interface NetworkState {
  connected: boolean;
  connectionType: "wifi" | "cellular" | "none" | "unknown";
}

/**
 * Get current network status.
 */
export async function getNetworkStatus(): Promise<NetworkState> {
  // Native path
  if (isNative() && isPluginAvailable("Network")) {
    try {
      const status: ConnectionStatus = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType as NetworkState["connectionType"],
      };
    } catch {
      return { connected: navigator.onLine, connectionType: "unknown" };
    }
  }

  // Web fallback
  return {
    connected: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  };
}

/**
 * Subscribe to network status changes.
 * Returns an unsubscribe function.
 *
 * Usage:
 * ```ts
 * const unsub = onNetworkChange((status) => {
 *   if (!status.connected) showOfflineBanner();
 *   else hideOfflineBanner();
 * });
 * // Later: unsub();
 * ```
 */
export function onNetworkChange(
  callback: (status: NetworkState) => void
): () => void {
  // Native path
  if (isNative() && isPluginAvailable("Network")) {
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    Network.addListener("networkStatusChange", (status: ConnectionStatus) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType as NetworkState["connectionType"],
      });
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }

  // Web fallback
  const onOnline = () =>
    callback({ connected: true, connectionType: "unknown" });
  const onOffline = () =>
    callback({ connected: false, connectionType: "none" });

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
