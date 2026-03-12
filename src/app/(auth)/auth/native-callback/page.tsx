"use client";

import { useEffect } from "react";

/**
 * Native OAuth landing page - runs inside SFSafariViewController (iOS)
 * or Chrome Custom Tabs (Android) after Google sign-in.
 *
 * The server route at /auth/callback handles web OAuth. For native, we
 * use this separate URL as the redirectTo so the sheet can forward the
 * auth code to the custom scheme without the server route redirecting
 * the sheet to /dashboard first.
 *
 * Flow:
 *   1. Native Google OAuth uses redirectTo: .../auth/native-callback
 *   2. Google lands here inside SFSafariViewController (no window.Capacitor)
 *   3. This page forwards the full URL to au.ecodia.wattleos://auth/callback
 *   4. iOS closes the sheet and fires appUrlOpen in the main WebView
 *   5. NativeInitializer routes /auth/callback?code=... to the server route
 *   6. Server route exchanges the code, resolves tenant, redirects to /dashboard
 */
export default function NativeCallbackPage() {
  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;

    if (search || hash) {
      window.location.href =
        "au.ecodia.wattleos://auth/callback" + search + hash;
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Signing you in…
        </div>
        <div style={{ color: "#888" }}>Returning to WattleOS</div>
      </div>
    </div>
  );
}
