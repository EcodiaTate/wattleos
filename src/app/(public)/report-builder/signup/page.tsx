"use client";

// src/app/(public)/report-builder/signup/page.tsx
//
// ============================================================
// WattleOS Report Builder - Self-Serve Signup
// ============================================================
// School name, name, email, password → atomic account creation.
// On success: redirects to /reports/setup (onboarding checklist).
//
// The user should see value within 2 minutes. That means:
//   - This form is as short as possible (4 fields)
//   - No email confirmation step (auto-confirmed)
//   - Immediate redirect to setup checklist, not a blank dashboard
// ============================================================

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupForReportBuilder } from "@/lib/actions/report-builder-signup";

export default function ReportBuilderSignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    schoolName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signupForReportBuilder({
      schoolName: form.schoolName,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      sourceUrl:
        typeof window !== "undefined" ? window.location.href : undefined,
    });

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    // Success - redirect to onboarding setup
    router.push("/reports/setup");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
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
            href="/report-builder/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Already have an account?
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Create your school account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Free for up to 40 students and 5 guides. No credit card required.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="schoolName"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                School name
              </label>
              <input
                id="schoolName"
                name="schoolName"
                type="text"
                required
                value={form.schoolName}
                onChange={handleChange}
                placeholder="Wattle Street Montessori"
                className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Your first name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Sarah"
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Chen"
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="sarah@wattleschool.edu.au"
                className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-95"
              style={{ background: "var(--color-primary)" }}
            >
              {isLoading ? "Creating your account..." : "Create free account"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account you agree to our{" "}
              <Link
                href="/legal/terms"
                className="underline hover:text-foreground"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="underline hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
