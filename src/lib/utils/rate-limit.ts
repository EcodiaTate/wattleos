// src/lib/utils/rate-limit.ts
//
// ============================================================
// WattleOS V2 - Rate Limiting (Upstash)
// ============================================================
// WHY Upstash: Serverless Redis that persists across Vercel
// cold starts. In-memory rate limiting resets every deploy
// and every cold start, making it useless against sustained
// attacks. Upstash's free tier covers 10K requests/day.
//
// WHY per-endpoint tiers: Public inquiry forms need tight
// limits (spam risk), while token validation can be slightly
// looser (read-only, but prevents enumeration).
//
// SETUP:
//   1. Create a free Redis database at https://console.upstash.com
//   2. Add to .env.local:
//      UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
//      UPSTASH_REDIS_REST_TOKEN=AXxx...
// ============================================================

import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure } from "@/types/api";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// ============================================================
// Redis Client (singleton)
// ============================================================
// WHY lazy init: Avoids crashing at import time if env vars
// are missing (e.g. during build or in test environments).
// ============================================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // In production, missing rate-limit config is a security misconfiguration -
    // all public endpoints would be unprotected. Throw to surface it immediately.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. " +
          "Rate limiting is required in production. Configure Upstash credentials.",
      );
    }
    // In development/test, log a warning and allow requests through.
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Rate limiting disabled in dev.",
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// ============================================================
// Rate Limiter Tiers
// ============================================================
// Each tier uses a sliding window algorithm - requests are
// counted within a rolling time window, providing smoother
// rate limiting than fixed windows.
//
// Limiters are created lazily to avoid import-time side effects.
// ============================================================

type RateLimitTier =
  | "public_write"
  | "public_read"
  | "auth_action"
  | "authenticated_llm"
  | "authenticated_export";

interface TierConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration string (e.g. "1 m", "1 h") */
  window: "1 m" | "5 m" | "10 m" | "15 m" | "1 h";
  /** Prefix for the Redis key (namespace isolation) */
  prefix: string;
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  // Inquiry form, enrollment application - creates DB rows
  // 5 submissions per 15 minutes per IP is generous for real users
  public_write: {
    limit: 5,
    window: "15 m",
    prefix: "rl:pub_write",
  },

  // Token validation, tour slot viewing - read-only but prevents enumeration
  // 20 requests per 5 minutes per IP
  public_read: {
    limit: 20,
    window: "5 m",
    prefix: "rl:pub_read",
  },

  // Invitation acceptance - requires auth but token is in URL
  // 10 attempts per 15 minutes per IP
  auth_action: {
    limit: 10,
    window: "15 m",
    prefix: "rl:auth_action",
  },

  // LLM streaming endpoints - keyed per user ID (not IP) so VPNs/shared IPs
  // don't interfere. Prevents a rogue authenticated user from running up
  // unbounded OpenAI/Anthropic API costs. 30 requests/min is ~1 chat msg
  // every 2 seconds - more than enough for normal use, low enough to matter.
  authenticated_llm: {
    limit: 30,
    window: "1 m",
    prefix: "rl:auth_llm",
  },

  // Bulk data export endpoints - keyed per user ID. Prevents data harvesting
  // by staff exporting entire student rosters in rapid succession.
  // 10 exports per 5 minutes is generous for legitimate use and tight enough
  // to matter if someone is bulk-exporting programmatically.
  authenticated_export: {
    limit: 10,
    window: "5 m",
    prefix: "rl:auth_export",
  },
};

const limiters = new Map<RateLimitTier, Ratelimit>();

function getLimiter(tier: RateLimitTier): Ratelimit | null {
  const existing = limiters.get(tier);
  if (existing) return existing;

  const redisClient = getRedis();
  if (!redisClient) return null;

  const config = TIER_CONFIGS[tier];
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: config.prefix,
    analytics: true, // Free Upstash analytics dashboard
  });

  limiters.set(tier, limiter);
  return limiter;
}

// ============================================================
// IP Resolution
// ============================================================
// WHY x-real-ip first: On Vercel, x-real-ip is set by the
// infrastructure and reflects the actual connection IP -
// clients cannot forge it. x-forwarded-for is also set by
// Vercel on the last hop, but could be spoofed if there's
// an upstream proxy that passes client-supplied headers through.
// "unknown" is safe - all unidentifiable traffic shares one
// bucket, which is more restrictive, not less.
// ============================================================

async function getClientIp(): Promise<string> {
  const headerStore = await headers();

  // x-real-ip is Vercel's authoritative client IP (not forgeable)
  const realIp = headerStore.get("x-real-ip");
  if (realIp) return realIp;

  // Fall back to first hop of x-forwarded-for (still useful in other hosts)
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    return forwarded.split(",")[0].trim();
  }

  return "unknown";
}

// ============================================================
// Public API
// ============================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check rate limit for the current request's IP address.
 *
 * @param tier - The rate limit tier to check against
 * @param identifier - Optional custom identifier (defaults to client IP).
 *                     Use for cases where you want per-email or per-tenant limits.
 *
 * @returns RateLimitResult with allowed status and metadata
 *
 * @example
 * ```ts
 * const rl = await checkRateLimit("public_write");
 * if (!rl.allowed) {
 *   return failure("Too many requests. Please try again later.", ErrorCodes.RATE_LIMITED);
 * }
 * ```
 */
export async function checkRateLimit(
  tier: RateLimitTier,
  identifier?: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(tier);

  // If rate limiting is not configured, allow all requests
  // WHY permissive default: Better to serve requests without
  // rate limiting than to block all traffic due to missing config.
  if (!limiter) {
    return { allowed: true, remaining: -1, resetAt: 0 };
  }

  const id = identifier ?? (await getClientIp());
  const result = await limiter.limit(id);

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

/**
 * Convenience helper: checks rate limit and returns a failure ActionResponse
 * if the limit is exceeded. Returns null if the request is allowed.
 *
 * WHY a helper: Reduces boilerplate in every public action to a 2-line check.
 *
 * @example
 * ```ts
 * export async function submitInquiry(input: SubmitInquiryInput): Promise<ActionResponse<WaitlistEntry>> {
 *   const blocked = await rateLimitOrFail("public_write");
 *   if (blocked) return blocked;
 *   // ... rest of action
 * }
 * ```
 */
export async function rateLimitOrFail<T>(
  tier: RateLimitTier,
  identifier?: string,
): Promise<ActionResponse<T> | null> {
  const result = await checkRateLimit(tier, identifier);

  if (!result.allowed) {
    const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    const resetMinutes = Math.ceil(resetInSeconds / 60);
    const timeStr = resetMinutes > 1 ? `${resetMinutes} minutes` : "a minute";

    return failure(
      `Too many requests. Please try again in ${timeStr}.`,
      ErrorCodes.RATE_LIMITED,
    );
  }

  return null;
}
