// src/components/native/OfflineIndicator.tsx
//
// ============================================================
// WattleOS - Offline Indicator
// ============================================================
// Shows a subtle banner when the device loses connectivity.
// Tells the guide that observations will be saved locally and
// synced when the connection returns.
//
// WHY: Montessori classrooms can have spotty WiFi. Guides
// shouldn't lose work because they walked to the outdoor area.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { onNetworkChange, getNetworkStatus, getQueueCount } from "@/lib/native";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    // Check initial status
    getNetworkStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    // Subscribe to changes
    const unsubscribe = onNetworkChange((status) => {
      setIsOffline(!status.connected);

      // When coming back online, check for queued items
      if (status.connected) {
        getQueueCount().then(setQueuedCount);
      }
    });

    return unsubscribe;
  }, []);

  // Update queued count when offline
  useEffect(() => {
    if (isOffline) {
      getQueueCount().then(setQueuedCount);
    }
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-medium text-background shadow-md"
    >
      {/* Offline icon */}
      <svg
        className="h-4 w-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <span>
        You're offline.{" "}
        {queuedCount > 0
          ? `${queuedCount} observation${queuedCount > 1 ? "s" : ""} saved locally - will sync when connected.`
          : "Changes will be saved locally."}
      </span>
    </div>
  );
}

// ============================================================
// Hook: useNetworkStatus
// ============================================================
// For components that need reactive network state.

export function useNetworkStatus(): {
  connected: boolean;
  connectionType: string;
} {
  const [status, setStatus] = useState({
    connected: true,
    connectionType: "unknown",
  });

  useEffect(() => {
    getNetworkStatus().then((s) =>
      setStatus({
        connected: s.connected,
        connectionType: s.connectionType,
      }),
    );

    const unsubscribe = onNetworkChange((s) =>
      setStatus({
        connected: s.connected,
        connectionType: s.connectionType,
      }),
    );

    return unsubscribe;
  }, []);

  return status;
}
