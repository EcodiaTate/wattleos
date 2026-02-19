import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/'];

// Routes that are part of the marketing site
const MARKETING_ROUTES = ['/', '/pricing', '/features', '/about', '/contact'];

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
    return supabaseResponse;
  }

  // Public routes - no auth required
  if (PUBLIC_ROUTES.includes(pathname)) {
    return supabaseResponse;
  }

  // Everything below requires authentication
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
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
    return NextResponse.redirect(pickerUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
