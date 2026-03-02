// src/proxy.ts
//
// ============================================================
// WattleOS V2 - Next.js Middleware (proxy.ts)
// ============================================================
// WHY proxy.ts not middleware.ts: Next.js 15 supports proxy.ts
// as the middleware entry point. Do NOT rename to middleware.ts.
//
// FIX APPLIED: When redirecting (to /login, /tenant-picker),
// we now copy session cookies from supabaseResponse onto the
// redirect response. Previously, redirects created a bare
// NextResponse.redirect() which discarded any cookies set by
// updateSession() - including refreshed JWTs. This caused
// stale sessions after redirect.
//
// SECURITY: CSP and security headers are applied via
// applySecurityHeaders() on all non-static response paths.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { randomBytes } from "crypto";

// Routes that don't require authentication (exact match)
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/", "/tenant-picker"];

// Route prefixes that don't require authentication (prefix match)
// These are public-facing family pages - enrollment, inquiry, tours, invite
const PUBLIC_ROUTE_PREFIXES = ["/enroll", "/inquiry", "/invite", "/tours"];

// Routes that are part of the marketing site
const MARKETING_ROUTES = ["/", "/pricing", "/features", "/about", "/contact"];

/**
 * Copy all Set-Cookie headers from the Supabase session response
 * onto a redirect response. Without this, JWT refreshes are lost
 * when the middleware redirects the user.
 */
function copySessionCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

// SECURITY: Tenant slugs must be lowercase alphanumeric + hyphens only.
// This prevents header injection if a malformed hostname reaches middleware.
// Pattern allows single-char slugs (e.g. "a") and up to 63 chars total.
const TENANT_SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Apply CSP and security headers to any response.
 *
 * WHY a helper: Multiple return paths in the proxy need
 * consistent security headers. DRY.
 *
 * WHY nonce-based script-src: The root layout has an inline
 * theme detection script (FOUC prevention). Rather than
 * allowing 'unsafe-inline' for all scripts, we generate a
 * per-request cryptographic nonce and pass it via x-nonce
 * header so the layout can apply it to that specific script.
 *
 * WHY HSTS only in production: Enforcing HTTPS on localhost
 * breaks development. HSTS caches in the browser so dev
 * machines would stop accepting plain HTTP forever.
 */
function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https://*.supabase.co",
    "media-src 'self' blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // HSTS: tell browsers to always use HTTPS for this domain (1 year).
  // Only set in production - localhost must remain accessible over HTTP.
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes that handle their own auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Generate a per-request nonce for the CSP script-src directive.
  // The nonce is passed via x-nonce header so the root layout can
  // apply it to the inline FOUC-prevention script.
  const nonce = generateNonce();

  // Refresh the Supabase session (critical for JWT validity)
  const { supabaseResponse, user } = await updateSession(request);

  // Pass nonce to the layout via request header
  supabaseResponse.headers.set("x-nonce", nonce);

  // Determine if this is a tenant subdomain
  const hostname = request.headers.get("host") ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "wattleos.com";
  const isSubdomain =
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}` &&
    !hostname.startsWith("localhost") &&
    !hostname.startsWith("127.0.0.1");

  // Extract tenant slug from subdomain (e.g., "green-valley" from "green-valley.wattleos.com").
  // SECURITY: Validate slug format before using as a header value to prevent
  // header injection. Slugs must be lowercase alphanumeric + hyphens only.
  let tenantSlug: string | null = null;
  if (isSubdomain) {
    const candidate = hostname.split(".")[0];
    tenantSlug = TENANT_SLUG_PATTERN.test(candidate) ? candidate : null;
  }

  // Marketing routes on root domain - no auth required
  if (!isSubdomain && MARKETING_ROUTES.includes(pathname)) {
    applySecurityHeaders(supabaseResponse, nonce);
    return supabaseResponse;
  }

  // Public routes - no auth required (exact match)
  if (PUBLIC_ROUTES.includes(pathname)) {
    applySecurityHeaders(supabaseResponse, nonce);
    return supabaseResponse;
  }

  // Public route prefixes - no auth required (covers dynamic segments like /invite/[token])
  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (tenantSlug) {
      supabaseResponse.headers.set("x-tenant-slug", tenantSlug);
    }
    applySecurityHeaders(supabaseResponse, nonce);
    return supabaseResponse;
  }

  // Everything below requires authentication
  if (!user) {
    // API routes must return JSON 401, not an HTML redirect.
    // Clients (mobile apps, fetch calls) can't follow a 307 to /login —
    // they'd silently receive an HTML page and misinterpret it as success.
    // The route handler itself also checks auth, but this gives a clean
    // early exit with the right status code and Content-Type.
    if (pathname.startsWith("/api/")) {
      const json = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      applySecurityHeaders(json, nonce);
      return json;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // SECURITY: Only allow same-origin relative redirects (no open redirect).
    // Paths starting with // could redirect to external hosts.
    if (pathname.startsWith("/") && !pathname.startsWith("//")) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    // FIX: Carry session cookies onto the redirect so the browser
    // persists any JWT refresh that happened in updateSession().
    const redirectResponse = copySessionCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
    applySecurityHeaders(redirectResponse, nonce);
    return redirectResponse;
  }

  // If on a subdomain, set the tenant slug as a header for downstream use
  if (tenantSlug) {
    supabaseResponse.headers.set("x-tenant-slug", tenantSlug);
  }

  // If user has no tenant_id in their JWT, redirect to tenant picker
  // (unless they're already on the tenant picker page)
  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId && pathname !== "/tenant-picker") {
    const pickerUrl = request.nextUrl.clone();
    pickerUrl.pathname = "/tenant-picker";
    // FIX: Carry session cookies onto the redirect.
    const redirectResponse = copySessionCookies(
      supabaseResponse,
      NextResponse.redirect(pickerUrl),
    );
    applySecurityHeaders(redirectResponse, nonce);
    return redirectResponse;
  }

  applySecurityHeaders(supabaseResponse, nonce);
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
