// src/app/(auth)/auth/callback/route.ts
//
// ============================================================
// WattleOS V2 - Google OAuth Callback
// ============================================================
// Supabase redirects here after Google sign-in. We exchange the
// auth code for a session, resolve the user's tenant(s), and
// redirect them to the appropriate page.
//
// INVITE FLOW (Module 10): If an `invite_token` query param is
// present, this is a parent accepting a school invitation. We
// call acceptParentInvitation() BEFORE the normal tenant
// resolution - this creates their tenant membership, guardian
// link, and marks the invitation as accepted. Then we stamp
// their tenant and send them straight to the dashboard.
//
// WHY handle invites here (not in a separate route): The OAuth
// redirect can only go to one URL. By handling it in the same
// callback, we avoid a second redirect hop and the invite token
// travels as a query param through the entire OAuth round-trip.
//
// BUG FIX (original): Cookies were set on NextResponse.next()
// but a different NextResponse.redirect() was returned. The
// redirect didn't carry session cookies → middleware saw no
// session → redirect loop to /login. Fix: accumulate cookies
// during exchangeCodeForSession, replay onto final redirect.
// ============================================================

import { acceptParentInvitation } from "@/lib/actions/enroll/accept-parent-invitation";
import { getUserTenants, setUserTenant } from "@/lib/auth/tenant-context";
import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { NextRequest, NextResponse } from "next/server";

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
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const inviteToken = searchParams.get("invite_token");

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
          cookiesToSet.forEach((cookie) => cookieStore.push(cookie));
        },
      },
    },
  );

  // Exchange the code for a session (this triggers setAll with auth cookies)
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;
  const userEmail = sessionData.user.email ?? "";

  // ── INVITE FLOW: If invite_token is present, accept the invitation ──
  // WHY before tenant resolution: The parent has no tenant_users row yet.
  // getUserTenants() would return [] and we'd redirect to no_school.
  // acceptParentInvitation creates the membership first.
  if (inviteToken) {
    const result = await acceptParentInvitation(userId, userEmail, inviteToken);

    if (result.data) {
      // Stamp the tenant into the user's JWT so RLS works immediately
      await setUserTenant(userId, result.data.tenant_id);

      // Clear the invite cookies (they were set by invite-accept-client as backup)
      const response = NextResponse.redirect(`${origin}/dashboard`);

      for (const { name, value, options } of cookieStore) {
        response.cookies.set(name, value, options);
      }

      // Clear invite-related cookies
      response.cookies.set("wattleos_invite_token", "", {
        path: "/",
        maxAge: 0,
      });
      response.cookies.set("wattleos_invite_tenant", "", {
        path: "/",
        maxAge: 0,
      });

      return response;
    }
    function errorToString(err: unknown): string {
      if (typeof err === "string") return err;
      if (err && typeof err === "object") {
        const anyErr = err as { message?: unknown; code?: unknown };
        if (typeof anyErr.message === "string") return anyErr.message;
        if (typeof anyErr.code === "string") return anyErr.code;
      }
      return "Failed to accept invitation";
    }

    const errorMsg = encodeURIComponent(errorToString(result.error));

    const response = NextResponse.redirect(
      `${origin}/login?error=invite_failed&message=${errorMsg}`,
    );

    for (const { name, value, options } of cookieStore) {
      response.cookies.set(name, value, options);
    }

    return response;
  }

  // ── NORMAL FLOW: Resolve tenants and redirect ─────────────────────────
  const tenants = await getUserTenants(userId);

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

  // ── Build the redirect response and replay ALL cookies onto it ────────
  const response = NextResponse.redirect(redirectUrl);

  for (const { name, value, options } of cookieStore) {
    response.cookies.set(name, value, options);
  }

  return response;
}
