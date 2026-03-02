// src/lib/native/local-storage.ts
//
// ============================================================
// WattleOS - Local Storage Bridge (Capacitor Preferences)
// ============================================================
// WHY: When a guide starts an observation but loses connectivity,
// we save the draft locally using Capacitor Preferences (native
// key-value storage). When the network returns, we sync.
//
// Also used for: caching the last-used student list, storing
// theme preferences, and keeping the auth token for faster
// app resume.
// ============================================================

import { Preferences } from "@capacitor/preferences";
import { isNative, isPluginAvailable } from "./platform";

/**
 * Store a value locally. Works on native (Capacitor Preferences)
 * and web (localStorage).
 */
export async function setLocal(key: string, value: string): Promise<void> {
  if (isNative() && isPluginAvailable("Preferences")) {
    try {
      await Preferences.set({ key, value });
      return;
    } catch {
      // Fall through to localStorage
    }
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Retrieve a locally stored value.
 */
export async function getLocal(key: string): Promise<string | null> {
  if (isNative() && isPluginAvailable("Preferences")) {
    try {
      const result = await Preferences.get({ key });
      return result.value;
    } catch {
      // Fall through
    }
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Remove a locally stored value.
 */
export async function removeLocal(key: string): Promise<void> {
  if (isNative() && isPluginAvailable("Preferences")) {
    try {
      await Preferences.remove({ key });
      return;
    } catch {
      // Fall through
    }
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Silent
  }
}

/**
 * Store a JSON-serializable object locally.
 */
export async function setLocalJSON<T>(key: string, value: T): Promise<void> {
  await setLocal(key, JSON.stringify(value));
}

/**
 * Retrieve and parse a JSON object from local storage.
 */
export async function getLocalJSON<T>(key: string): Promise<T | null> {
  const raw = await getLocal(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ============================================================
// Draft Observation Queue
// ============================================================
// WHY: If the guide saves an observation while offline, we queue
// it locally and sync when connectivity returns.

const DRAFT_QUEUE_KEY = "wattle:observation_draft_queue";

export interface QueuedObservation {
  id: string; // Client-generated UUID
  content: string;
  studentIds: string[];
  outcomeIds: string[];
  photos: Array<{
    base64Data: string;
    mimeType: string;
    fileName: string;
  }>;
  createdAt: string; // ISO timestamp
  publish: boolean;
}

/**
 * Add a draft observation to the offline queue.
 */
export async function queueObservation(
  draft: QueuedObservation
): Promise<void> {
  const existing = await getLocalJSON<QueuedObservation[]>(DRAFT_QUEUE_KEY);
  const queue = existing ?? [];
  queue.push(draft);
  await setLocalJSON(DRAFT_QUEUE_KEY, queue);
}

/**
 * Get all queued observations waiting to sync.
 */
export async function getQueuedObservations(): Promise<QueuedObservation[]> {
  return (await getLocalJSON<QueuedObservation[]>(DRAFT_QUEUE_KEY)) ?? [];
}

/**
 * Remove a specific observation from the queue (after successful sync).
 */
export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueuedObservations();
  const filtered = queue.filter((o) => o.id !== id);
  await setLocalJSON(DRAFT_QUEUE_KEY, filtered);
}

/**
 * Clear the entire queue (after full sync).
 */
export async function clearQueue(): Promise<void> {
  await removeLocal(DRAFT_QUEUE_KEY);
}

/**
 * Get the count of queued observations (for badge display).
 */
export async function getQueueCount(): Promise<number> {
  const queue = await getQueuedObservations();
  return queue.length;
}
