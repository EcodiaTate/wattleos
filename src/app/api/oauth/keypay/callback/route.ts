/**
 * src/app/api/oauth/keypay/callback/route.ts
 *
 * ============================================================
 * KeyPay OAuth Callback
 * ============================================================
 * Receives the authorization code from KeyPay after user
 * grants permission. Exchanges code for access token and
 * stores it encrypted in the database.
 */

import KeyPayClient from "@/lib/integrations/keypay/client";
import {
  verifyOAuthState,
  storeKeyPayTokens,
} from "@/lib/integrations/keypay/oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const settingsUrl = `${origin}/admin/settings/payroll`;

  const redirect = (params: string) =>
    NextResponse.redirect(`${settingsUrl}?${params}`);

  try {
    // 1. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // 2. Handle error response from KeyPay
    if (error) {
      console.error(`KeyPay OAuth error: ${error}`, errorDescription);
      return redirect(`oauth_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return redirect("oauth_error=missing_parameters");
    }

    // 3. Verify state token (CSRF protection)
    const verifyResult = await verifyOAuthState(state);
    if (!verifyResult) {
      console.error("Invalid or expired OAuth state token");
      return redirect("oauth_error=invalid_state");
    }

    const { tenantId } = verifyResult;

    // 4. Exchange code for access token
    const keypayClient = new KeyPayClient({
      clientId: process.env.KEYPAY_CLIENT_ID ?? "",
      clientSecret: process.env.KEYPAY_CLIENT_SECRET ?? "",
      redirectUri: process.env.KEYPAY_REDIRECT_URI ?? "",
    });

    const tokenResponse = await keypayClient.exchangeCodeForToken(code);

    // 5. Store encrypted tokens in database
    await storeKeyPayTokens(
      tenantId,
      tokenResponse.accessToken,
      tokenResponse.refreshToken,
      tokenResponse.expiresIn,
      tokenResponse.partnerId
    );

    // 6. Redirect to payroll settings with success message
    return redirect("oauth_success=true&provider=keypay");
  } catch (err) {
    console.error("KeyPay OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error during OAuth callback";
    return redirect(`oauth_error=${encodeURIComponent(message)}`);
  }
}
