"use client";

// ============================================================
// WattleOS V2 - MFA Verify Client (Login Flow)
// ============================================================
// Shows TOTP input or backup code input. On success, redirects
// to /dashboard. Used during the login flow when a user has
// MFA enrolled.
// ============================================================

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { verifyBackupCode } from "@/lib/actions/mfa";

export function MfaVerifyClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  // On mount, check for TOTP factors
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
      } else {
        // No MFA factor — shouldn't be here, redirect to dashboard
        router.replace("/dashboard");
      }
    });
  }, [router]);

  function handleVerifyTotp() {
    if (code.length !== 6 || !factorId) return;
    setError("");

    startTransition(async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        setError("Failed to create challenge. Please try again.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        setError("Invalid code. Please try again.");
        setCode("");
        return;
      }

      // MFA verified — redirect to app
      router.replace("/dashboard");
    });
  }

  function handleVerifyBackup() {
    if (!code.trim()) return;
    setError("");

    startTransition(async () => {
      const result = await verifyBackupCode(code.trim());

      if (result.error) {
        setError(result.error);
        setCode("");
        return;
      }

      if (result.data?.remainingCodes === 0) {
        // Last code used — warn them
        setError("");
      }

      // Backup code verified — redirect to app
      router.replace("/dashboard");
    });
  }

  if (!useBackupCode) {
    return (
      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="totp-code"
            className="sr-only"
          >
            Authentication code
          </label>
          <input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full rounded-md border border-input bg-background px-3 py-3 text-center font-mono text-2xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerifyTotp();
            }}
          />
        </div>

        <button
          onClick={handleVerifyTotp}
          disabled={isPending || code.length !== 6}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Verifying..." : "Verify"}
        </button>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="text-center">
          <button
            onClick={() => {
              setUseBackupCode(true);
              setCode("");
              setError("");
            }}
            className="text-sm text-muted-foreground hover:underline"
          >
            Use a backup code instead
          </button>
        </div>
      </div>
    );
  }

  // ── Backup code input ─────────────────────────────────────
  return (
    <div className="mt-6 space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Enter one of your backup codes.
      </p>

      <div>
        <label htmlFor="backup-code" className="sr-only">
          Backup code
        </label>
        <input
          id="backup-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          className="w-full rounded-md border border-input bg-background px-3 py-3 text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleVerifyBackup();
          }}
        />
      </div>

      <button
        onClick={handleVerifyBackup}
        disabled={isPending || !code.trim()}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Verifying..." : "Verify backup code"}
      </button>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <div className="text-center">
        <button
          onClick={() => {
            setUseBackupCode(false);
            setCode("");
            setError("");
          }}
          className="text-sm text-muted-foreground hover:underline"
        >
          Use authenticator app instead
        </button>
      </div>
    </div>
  );
}
