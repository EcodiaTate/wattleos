// src/app/(auth)/auth/callback/route.ts
//
// ============================================================
// WattleOS V2 - Google OAuth Callback
// ============================================================
// Supabase redirects here after Google sign-in. We exchange the
// auth code for a session, resolve the user's tenant(s), and
// redirect them to the appropriate page.
//
// BUG FIX: The original version set cookies on a NextResponse.next()
// object but returned a *different* NextResponse.redirect(). The
// redirect response didn't carry the session cookies, so the browser
// never received them → middleware saw no session → redirect to /login.
//
// FIX: We accumulate cookies during exchangeCodeForSession, then
// copy them onto whichever redirect response we return.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieSerializeOptions } from 'cookie';
import { getUserTenants, setUserTenant } from '@/lib/auth/tenant-context';

/**
 * Supabase SSR calls setAll([{ name, value, options }, ...])
 * We store them so we can replay onto the final redirect response.
 */
type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSerializeOptions;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // ── Accumulate cookies set by Supabase during exchangeCodeForSession ──
  const cookieStore: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Store every cookie Supabase wants to set
          cookiesToSet.forEach((cookie) => cookieStore.push(cookie));
        },
      },
    }
  );

  // Exchange the code for a session (this triggers setAll with auth cookies)
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;

  // Check how many tenants this user belongs to
  const tenants = await getUserTenants(userId);

  // ── Determine where to send the user ──
  let redirectUrl: string;

  if (tenants.length === 0) {
    redirectUrl = `${origin}/login?error=no_school`;
  } else if (tenants.length === 1) {
    // Single tenant - stamp it into the JWT and go straight to the app
    await setUserTenant(userId, tenants[0].tenant.id);
    redirectUrl = `${origin}${redirectTo}`;
  } else {
    // Multiple tenants - let them pick
    redirectUrl = `${origin}/tenant-picker`;
  }

  // ── Build the redirect response and replay ALL cookies onto it ──
  const response = NextResponse.redirect(redirectUrl);

  for (const { name, value, options } of cookieStore) {
    response.cookies.set(name, value, options);
  }

  return response;
}