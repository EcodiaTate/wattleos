// src/lib/native/observation-sync.ts
//
// ============================================================
// WattleOS - Observation Sync Service
// ============================================================
// WHY: Montessori guides capture observations in the classroom
// where WiFi can be spotty. Observations are queued locally
// (via local-storage.ts) and this service syncs them to the
// server when connectivity returns.
//
// STRATEGY:
//   - On app resume + online: sync all queued observations
//   - On network change (offline → online): sync all queued
//   - Per-observation retry with exponential backoff
//   - Failed observations stay in queue for next attempt
//   - Photos are uploaded as base64 media attachments
// ============================================================

import { createObservation } from "@/lib/actions/observations";
import { addObservationMedia } from "@/lib/actions/observations";
import {
  getQueuedObservations,
  removeFromQueue,
  type QueuedObservation,
} from "./local-storage";
import { getNetworkStatus, onNetworkChange } from "./network";

// ============================================================
// Types
// ============================================================

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null; // ID of observation currently syncing
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ observationId: string; error: string }>;
}

// ============================================================
// Configuration
// ============================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, then 2s, 4s
const MAX_DELAY_MS = 30000;

// Prevent concurrent syncs
let isSyncing = false;

// ============================================================
// syncQueuedObservations
// ============================================================
// Main entry point. Syncs all queued observations to the server.
// Safe to call multiple times - concurrent calls are deduplicated.
// ============================================================

export async function syncQueuedObservations(
  onProgress?: SyncProgressCallback,
): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    return { synced: 0, failed: 0, errors: [] };
  }

  // Check network before starting
  const network = await getNetworkStatus();
  if (!network.connected) {
    return { synced: 0, failed: 0, errors: [] };
  }

  isSyncing = true;

  try {
    const queue = await getQueuedObservations();

    if (queue.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    const progress: SyncProgress = {
      total: queue.length,
      completed: 0,
      failed: 0,
      current: null,
    };

    const errors: SyncResult["errors"] = [];

    for (const observation of queue) {
      progress.current = observation.id;
      onProgress?.(progress);

      const synced = await syncSingleObservation(observation);

      if (synced.success) {
        await removeFromQueue(observation.id);
        progress.completed++;
      } else {
        progress.failed++;
        errors.push({
          observationId: observation.id,
          error: synced.error,
        });
      }

      onProgress?.(progress);
    }

    progress.current = null;
    onProgress?.(progress);

    return {
      synced: progress.completed,
      failed: progress.failed,
      errors,
    };
  } finally {
    isSyncing = false;
  }
}

// ============================================================
// syncSingleObservation
// ============================================================
// Syncs one observation with retry + exponential backoff.
// ============================================================

async function syncSingleObservation(
  observation: QueuedObservation,
): Promise<{ success: boolean; error: string }> {
  let lastError = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Check network before each attempt
    const network = await getNetworkStatus();
    if (!network.connected) {
      return { success: false, error: "No network connection" };
    }

    try {
      // 1. Create the observation on server
      const result = await createObservation({
        content: observation.content,
        studentIds: observation.studentIds,
        outcomeIds: observation.outcomeIds,
      });

      if (result.error || !result.data) {
        lastError = result.error?.message ?? "Failed to create observation";

        // Don't retry on validation errors - they'll fail again
        if (result.error?.code === "VALIDATION_ERROR") {
          return { success: false, error: lastError };
        }

        await delay(getBackoffDelay(attempt));
        continue;
      }

      const serverId = result.data.id;

      // 2. Upload photos as media attachments
      for (const photo of observation.photos) {
        await addObservationMedia({
          observationId: serverId,
          mediaType: "image",
          storageProvider: "supabase",
          fileName: photo.fileName,
        });
      }

      // 3. Auto-publish if the observation was marked for publish
      if (observation.publish) {
        // Import dynamically to avoid circular deps
        const { publishObservation } =
          await import("@/lib/actions/observations");
        await publishObservation(serverId);
      }

      return { success: true, error: "" };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown sync error";
      await delay(getBackoffDelay(attempt));
    }
  }

  return { success: false, error: lastError };
}

// ============================================================
// initObservationSync
// ============================================================
// Sets up automatic sync on network status changes.
// Returns a cleanup function to unsubscribe.
// ============================================================

export function initObservationSync(
  onProgress?: SyncProgressCallback,
): () => void {
  // Listen for network changes: offline → online triggers sync
  const unsubscribe = onNetworkChange(async (status) => {
    if (status.connected) {
      await syncQueuedObservations(onProgress);
    }
  });

  return unsubscribe;
}

// ============================================================
// Helpers
// ============================================================

function getBackoffDelay(attempt: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, MAX_DELAY_MS);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
