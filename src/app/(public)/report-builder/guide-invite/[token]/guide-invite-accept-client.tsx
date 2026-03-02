"use client";

// src/app/(public)/report-builder/guide-invite/[token]/guide-invite-accept-client.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptGuideInvitation } from "@/lib/actions/report-builder-signup";

interface Props {
  token: string;
  inviteId: string;
  email: string;
  schoolName: string;
  classLabels: string[];
}

export function GuideInviteAcceptClient({
  token,
  email,
  schoolName,
  classLabels,
}: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await acceptGuideInvitation({ token, password });

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    router.push("/reports/my-reports");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          You&apos;ve been invited to fill reports
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{schoolName}</span> has
          invited you to complete student reports using WattleOS Report Builder.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-5 rounded-lg bg-muted/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">Invited as</p>
          <p className="mt-0.5 font-medium text-foreground">{email}</p>
          {classLabels.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Assigned to:{" "}
              <span className="font-medium text-foreground">
                {classLabels.join(", ")}
              </span>
            </p>
          )}
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Create a password for your account
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="At least 8 characters"
              className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {isLoading ? "Setting up your account..." : "Accept invitation"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/report-builder/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in instead
          </a>
        </p>
      </div>
    </div>
  );
}
