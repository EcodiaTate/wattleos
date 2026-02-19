// src/app/(public)/invite/[token]/invite-accept-client.tsx
//
// ============================================================
// WattleOS V2 - Invite Accept Client (Module 10)
// ============================================================
// 'use client' - handles Google OAuth sign-in for invite
// acceptance. After OAuth, the callback route detects the
// pending invite token in the URL query param and calls
// acceptParentInvitation() to complete the link.
//
// WHY client-side OAuth trigger: Supabase Auth signInWithOAuth
// must run in the browser to initiate the redirect flow.
// The server component validated the token; this component
// just handles the "click to sign in" interaction.
//
// FIX: Import was `createClient` which doesn't exist in
// browser.ts - the actual export is `createSupabaseBrowserClient`.
// ============================================================

"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

interface InviteAcceptClientProps {
  token: string;
  inviteId: string;
  email: string;
  studentName: string;
  schoolName: string;
  tenantId: string;
}

export function InviteAcceptClient({
  token,
  inviteId,
  email,
  studentName,
  schoolName,
  tenantId,
}: InviteAcceptClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAcceptWithGoogle() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // Store invite token in a cookie as a backup - the primary
      // mechanism is the query param on the redirectTo URL, but
      // cookies serve as a fallback if the URL gets truncated.
      document.cookie = `wattleos_invite_token=${token}; path=/; max-age=3600; samesite=lax`;
      document.cookie = `wattleos_invite_tenant=${tenantId}; path=/; max-age=3600; samesite=lax`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // WHY invite_token in redirectTo: This query param survives
          // the entire Google OAuth round-trip and arrives at the
          // callback route, where it triggers acceptParentInvitation().
          redirectTo: `${window.location.origin}/auth/callback?invite_token=${token}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            login_hint: email,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
      // If successful, browser redirects - no need to setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">🎓</div>
        <h2 className="text-xl font-bold text-gray-900">
          You&apos;re Invited!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{schoolName}</span> has invited you to
          join WattleOS as a parent of{" "}
          <span className="font-medium">{studentName}</span>.
        </p>

        <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-left">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">School</dt>
              <dd className="font-medium text-gray-900">{schoolName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Student</dt>
              <dd className="font-medium text-gray-900">{studentName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Your Email</dt>
              <dd className="font-medium text-gray-900">{email}</dd>
            </div>
          </dl>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleAcceptWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
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
          {loading ? "Redirecting…" : "Sign in with Google to Accept"}
        </button>

        <p className="mt-4 text-xs text-gray-400">
          By signing in, you&apos;ll create your WattleOS parent account and get
          access to {studentName}&apos;s portfolio, attendance, reports, and
          school communications.
        </p>
      </div>
    </div>
  );
}
