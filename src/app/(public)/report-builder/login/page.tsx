"use client";

// src/app/(public)/report-builder/login/page.tsx
//
// ============================================================
// WattleOS Report Builder - Login (returning users)
// ============================================================

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function ReportBuilderLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : authError.message,
      );
      setIsLoading(false);
      return;
    }

    router.push("/reports");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            href="/report-builder"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded text-white text-xs font-bold"
              style={{ background: "var(--color-primary)" }}
            >
              W
            </div>
            WattleOS Report Builder
          </Link>
          <Link
            href="/report-builder/signup"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Create account
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome back to WattleOS Report Builder
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@school.edu.au"
                className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Your password"
                className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/report-builder/signup"
              className="font-medium text-primary hover:underline"
            >
              Start free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
