"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

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
// Inner Form (needs useSearchParams → requires Suspense)
// ============================================================

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = searchParams.get("reason");
  const urlError = searchParams.get("error");

  const reasonInfo = reason ? REASON_MESSAGES[reason] : null;
  const urlErrorMessage = urlError ? ERROR_MESSAGES[urlError] : null;

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }

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

      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
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
        {isLoading ? "Signing in..." : "Continue with Google"}
      </button>

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
