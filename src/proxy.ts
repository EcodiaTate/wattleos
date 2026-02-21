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

import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/', '/tenant-picker'];

// Routes that are part of the marketing site
const MARKETING_ROUTES = ['/', '/pricing', '/features', '/about', '/contact'];

/**
 * Copy all Set-Cookie headers from the Supabase session response
 * onto a redirect response. Without this, JWT refreshes are lost
 * when the middleware redirects the user.
 */
function copySessionCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

/**
 * Apply CSP and security headers to any response.
 *
 * WHY a helper: Multiple return paths in the proxy need
 * consistent security headers. DRY.
 *
 * WHY 'unsafe-inline' for scripts: The root layout has a
 * dangerouslySetInnerHTML theme detection script that prevents
 * FOUC. Without 'unsafe-inline', this would be blocked.
 * Future improvement: switch to nonce-based CSP.
 */
function applySecurityHeaders(response: NextResponse): void {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
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
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes that handle their own auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Refresh the Supabase session (critical for JWT validity)
  const { supabaseResponse, user } = await updateSession(request);

  // Determine if this is a tenant subdomain
  const hostname = request.headers.get('host') ?? '';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'wattleos.com';
  const isSubdomain =
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}` &&
    !hostname.startsWith('localhost') &&
    !hostname.startsWith('127.0.0.1');

  // Extract tenant slug from subdomain (e.g., "green-valley" from "green-valley.wattleos.com")
  let tenantSlug: string | null = null;
  if (isSubdomain) {
    tenantSlug = hostname.split('.')[0];
  }

  // Marketing routes on root domain - no auth required
  if (!isSubdomain && MARKETING_ROUTES.includes(pathname)) {
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  // Public routes - no auth required
  if (PUBLIC_ROUTES.includes(pathname)) {
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  // Everything below requires authentication
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    // FIX: Carry session cookies onto the redirect so the browser
    // persists any JWT refresh that happened in updateSession().
    const redirectResponse = copySessionCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl)
    );
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // If on a subdomain, set the tenant slug as a header for downstream use
  if (tenantSlug) {
    supabaseResponse.headers.set('x-tenant-slug', tenantSlug);
  }

  // If user has no tenant_id in their JWT, redirect to tenant picker
  // (unless they're already on the tenant picker page)
  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId && pathname !== '/tenant-picker') {
    const pickerUrl = request.nextUrl.clone();
    pickerUrl.pathname = '/tenant-picker';
    // FIX: Carry session cookies onto the redirect.
    const redirectResponse = copySessionCookies(
      supabaseResponse,
      NextResponse.redirect(pickerUrl)
    );
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};