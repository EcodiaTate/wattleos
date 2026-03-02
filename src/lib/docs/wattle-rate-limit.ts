// src/lib/docs/wattle-rate-limit.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Rate Limiter
// ============================================================
// In-memory sliding-window rate limiter for write operations
// performed via Ask Wattle tools. Prevents a single user from
// accidentally (or maliciously) flooding the system with writes.
//
// WHY in-memory: With a single-server deployment (Vercel
// Serverless), a Map is sufficient. If we scale to multiple
// instances, we'd swap this for Redis. The pattern is the
// same - we just change the backing store.
//
// WHY per-user: Rate limits are per user, not global. A surge
// of writes from User A shouldn't block User B.
//
// Default: max 10 write operations per user per minute.
// ============================================================

interface RateLimitEntry {
  timestamps: number[];
}

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_WRITES_PER_WINDOW = 10;

/** userId → sliding window of write timestamps */
const userWriteWindows = new Map<string, RateLimitEntry>();

/**
 * Check if a user is allowed to perform a write operation.
 *
 * @returns `{ allowed: true }` if the write is within limits,
 *          `{ allowed: false, retryAfterMs }` if rate-limited.
 */
export function checkWriteRateLimit(
  userId: string,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = userWriteWindows.get(userId);

  if (!entry) {
    // First write ever - allow it
    userWriteWindows.set(userId, { timestamps: [now] });
    return { allowed: true };
  }

  // Prune timestamps older than the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_WRITES_PER_WINDOW) {
    // Rate-limited - tell the caller when the oldest entry expires
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  // Allow the write
  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Record a successful write without checking the limit first.
 * Use this after the write completes if you already checked.
 */
export function recordWrite(userId: string): void {
  const now = Date.now();
  const entry = userWriteWindows.get(userId);

  if (!entry) {
    userWriteWindows.set(userId, { timestamps: [now] });
  } else {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
    entry.timestamps.push(now);
  }
}
