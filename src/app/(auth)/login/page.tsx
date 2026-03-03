"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";

// ============================================================
// Message Maps
// ============================================================

const REASON_MESSAGES: Record<
  string,
  { message: string; variant: "info" | "warning" }
> = {
  idle: {
    message:
      "Your session expired due to inactivity. Please sign in again.",
    variant: "warning",
  },
  signed_out: {
    message: "You have been signed out successfully.",
    variant: "info",
  },
};

const ERROR_MESSAGES: Record<string, string> = {
  no_school:
    "No school account was found for your email. Contact your school administrator.",
  auth_failed: "Authentication failed. Please try again.",
  access_denied:
    "Access denied. Your account may not have permission to sign in.",
  callback_error: "Something went wrong during sign-in. Please try again.",
  missing_code: "Sign-in was interrupted. Please try again.",
};

// ============================================================
// Helpers
// ============================================================

function randomNonce(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// Inner Form (needs useSearchParams → requires Suspense)
// ============================================================

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  const reason = searchParams.get("reason");
  const urlError = searchParams.get("error");

  const reasonInfo = reason ? REASON_MESSAGES[reason] : null;
  const urlErrorMessage = urlError ? ERROR_MESSAGES[urlError] : null;

  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    if (isNative) {
      // On native, open Google OAuth in SFSafariViewController (iOS) or
      // Chrome Custom Tab (Android). skipBrowserRedirect prevents Supabase
      // from navigating the WebView away from the app. After Google auth,
      // the sheet lands on /auth/native-callback which forwards to the
      // custom scheme au.ecodia.wattleos://auth/callback. NativeInitializer
      // intercepts appUrlOpen and routes to /auth/callback (server route).
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/native-callback`,
          skipBrowserRedirect: true,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setIsLoading(false);
        return;
      }
      if (data?.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      }
      // Loading stays true — session change will trigger a page navigation
      return;
    }

    // Web: standard redirect flow
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
  }, [isNative]);

  const handleAppleLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { SignInWithApple } = await import(
        "@capacitor-community/apple-sign-in"
      );
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

      // Raw nonce for Supabase, SHA-256 hash for Apple's request
      const nonce = randomNonce(32);
      const nonceHash = await sha256Hex(nonce);

      const result = await SignInWithApple.authorize({
        clientId: "au.ecodia.wattleos",
        redirectURI: `${siteUrl}/auth/callback`, // unused on native iOS, required by plugin types
        scopes: "email name",
        state: `wattleos-${Date.now()}`,
        nonce: nonceHash,
      });

      const identityToken =
        (result as any)?.response?.identityToken ??
        (result as any)?.identityToken;

      if (!identityToken) {
        setError("Apple Sign-In failed: missing identity token.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
        nonce, // raw nonce — Supabase hashes it and compares to Apple's claim
      });

      if (signInError) {
        setError(signInError.message);
      }
      // Success: onAuthStateChange fires → middleware redirects to /dashboard
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      // 1001 = ASAuthorizationErrorCanceled — user dismissed, not an error
      if (!msg.includes("1001") && !msg.toLowerCase().includes("cancel")) {
        setError(msg || "Apple Sign-In failed.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-background p-8 shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          WattleOS
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your school&apos;s operating system
        </p>
      </div>

      {/* URL-based reason message (info/warning) */}
      {reasonInfo && (
        <div
          className={`rounded-md p-[var(--density-card-padding)] text-sm ${
            reasonInfo.variant === "warning"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          {reasonInfo.message}
        </div>
      )}

      {/* URL-based error message */}
      {urlErrorMessage && !error && (
        <div className="rounded-md bg-destructive/10 p-[var(--density-card-padding)] text-sm text-destructive">
          {urlErrorMessage}
        </div>
      )}

      {/* Runtime error from OAuth attempt */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-[var(--density-card-padding)] text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Apple Sign-In — native only, black per Apple HIG */}
        {isNative && (
          <button
            onClick={handleAppleLogin}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            }}
          >
            <AppleMark />
            {isLoading ? "Signing in…" : "Sign in with Apple"}
          </button>
        )}

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleG />
          {isLoading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By signing in, you agree to our{" "}
        <Link
          href="/legal/terms"
          className="underline transition-colors hover:text-foreground"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="underline transition-colors hover:text-foreground"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

// ============================================================
// Page (wraps form in Suspense for useSearchParams)
// ============================================================

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense
        fallback={
          <div className="w-full max-w-md animate-pulse rounded-xl bg-background p-8 shadow-lg">
            <div className="mx-auto mb-4 h-8 w-32 rounded bg-muted" />
            <div className="mx-auto mb-8 h-4 w-48 rounded bg-muted" />
            <div className="h-12 rounded bg-muted" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

// ============================================================
// SVG Icons
// ============================================================

function AppleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.48 2.22-1.26 3.06-.81.87-2.14 1.55-3.31 1.46-.15-1.1.43-2.27 1.19-3.07.84-.89 2.24-1.54 3.38-1.45ZM20.39 17.13c-.54 1.24-.8 1.8-1.5 2.9-.98 1.52-2.36 3.41-4.06 3.43-1.51.02-1.9-.99-3.96-.98-2.06.01-2.49 1.0-4 .98-1.7-.02-3-1.73-3.98-3.25-2.74-4.24-3.03-9.22-1.34-11.82 1.2-1.86 3.1-2.96 4.89-2.96 1.83 0 2.98 1.0 4.49 1.0 1.47 0 2.36-1.0 4.47-1.0 1.6 0 3.3.87 4.5 2.36-3.95 2.16-3.31 7.78.49 9.34Z"
      />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
