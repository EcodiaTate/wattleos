"use client";

// ============================================================
// WattleOS V2 - MFA Enrollment Client Component
// ============================================================
// Interactive TOTP enrollment flow:
//   1. User clicks "Set up two-factor authentication"
//   2. Server returns QR code + secret
//   3. User scans QR, enters 6-digit code
//   4. Server verifies, returns backup codes
//   5. User downloads/copies backup codes
//
// Also handles unenrollment and status display.
// ============================================================

import { useState, useTransition, useEffect } from "react";
import {
  enrollMfa,
  verifyMfaEnrollment,
  unenrollMfa,
} from "@/lib/actions/mfa";

type Props = {
  enrolled: boolean;
  required: boolean;
  factorId: string | null;
  backupCodesRemaining: number;
  roleName: string;
  /** When true, immediately start the enrollment flow (used when redirected
   *  from login because MFA is required for this role but not yet set up). */
  autoStartEnroll?: boolean;
};

type Step = "status" | "qr" | "verify" | "backup" | "unenroll-confirm";

export function MfaEnrollmentClient({
  enrolled: initialEnrolled,
  required,
  factorId: initialFactorId,
  backupCodesRemaining: initialBackupCodes,
  roleName,
  autoStartEnroll = false,
}: Props) {
  const [step, setStep] = useState<Step>("status");
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [factorId, setFactorId] = useState(initialFactorId);
  const [backupCodesRemaining, setBackupCodesRemaining] =
    useState(initialBackupCodes);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleStartEnroll() {
    setError("");
    startTransition(async () => {
      const result = await enrollMfa();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setFactorId(result.data.factorId);
        setQrCode(result.data.qrCode);
        setSecret(result.data.secret);
        setStep("qr");
      }
    });
  }

  // When redirected here because MFA is required, auto-start enrollment
  useEffect(() => {
    if (autoStartEnroll && !initialEnrolled) {
      handleStartEnroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVerify() {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await verifyMfaEnrollment(factorId!, code);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setBackupCodes(result.data.backupCodes);
        setBackupCodesRemaining(result.data.backupCodes.length);
        setEnrolled(true);
        setStep("backup");
      }
    });
  }

  function handleUnenroll() {
    setError("");
    startTransition(async () => {
      const result = await unenrollMfa(factorId!);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEnrolled(false);
      setFactorId(null);
      setBackupCodesRemaining(0);
      setStep("status");
    });
  }

  function handleCopyBackupCodes() {
    const text = backupCodes.join("\n");
    navigator.clipboard.writeText(text);
  }

  function handleDownloadBackupCodes() {
    const text = [
      "WattleOS Backup Codes",
      "=====================",
      "Each code can only be used once.",
      "Store these in a safe place.",
      "",
      ...backupCodes,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wattleos-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Status view ─────────────────────────────────────────────
  if (step === "status") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
          <h2 className="text-base font-semibold text-foreground">
            Two-factor authentication
          </h2>

          {enrolled ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Enabled
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your account is protected with an authenticator app.
                {backupCodesRemaining > 0 && (
                  <> You have {backupCodesRemaining} backup code{backupCodesRemaining !== 1 ? "s" : ""} remaining.</>
                )}
                {backupCodesRemaining === 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}
                    You have no backup codes remaining. Consider re-enrolling to
                    generate new ones.
                  </span>
                )}
              </p>
              {!required && (
                <button
                  onClick={() => setStep("unenroll-confirm")}
                  className="text-sm text-destructive hover:underline"
                >
                  Remove two-factor authentication
                </button>
              )}
              {required && (
                <p className="text-xs text-muted-foreground">
                  Two-factor authentication is required for the{" "}
                  <strong>{roleName}</strong> role and cannot be disabled.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account by requiring a
                code from an authenticator app when you sign in.
              </p>
              {required && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  Your school requires two-factor authentication for the{" "}
                  <strong>{roleName}</strong> role. Please set it up now.
                </div>
              )}
              <button
                onClick={handleStartEnroll}
                disabled={isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Starting..." : "Set up two-factor authentication"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // ── QR code view ────────────────────────────────────────────
  if (step === "qr") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
          <h2 className="text-base font-semibold text-foreground">
            Scan QR code
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan this QR code with your authenticator app (Google Authenticator,
            Authy, 1Password, etc.).
          </p>

          <div className="mt-4 flex justify-center">
            {/* Supabase returns a data URI SVG for the QR code */}
            <img
              src={qrCode}
              alt="MFA QR Code"
              className="h-48 w-48 rounded-lg border border-border"
            />
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              Can't scan? Enter this key manually:
            </p>
            <code className="mt-1 block rounded bg-muted px-3 py-2 text-xs font-mono break-all">
              {secret}
            </code>
          </div>

          <div className="mt-6">
            <label
              htmlFor="mfa-code"
              className="block text-sm font-medium text-foreground"
            >
              Enter the 6-digit code from your app
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCode(val);
                }}
                placeholder="000000"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleVerify}
                disabled={isPending || code.length !== 6}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setStep("status");
            setCode("");
            setError("");
          }}
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancel
        </button>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // ── Backup codes view ───────────────────────────────────────
  if (step === "backup") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
          <h2 className="text-base font-semibold text-foreground">
            Save your backup codes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If you lose access to your authenticator app, you can use one of
            these backup codes to sign in. Each code can only be used once.
          </p>

          <div className="mt-4 rounded-md bg-muted p-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((bc) => (
                <code
                  key={bc}
                  className="text-center font-mono text-sm tracking-wider"
                >
                  {bc}
                </code>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopyBackupCodes}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Copy codes
            </button>
            <button
              onClick={handleDownloadBackupCodes}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Download
            </button>
          </div>

          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Store these codes in a safe place. You will not be able to see them
            again.
          </div>
        </div>

        <button
          onClick={() => {
            setStep("status");
            setBackupCodes([]);
            setCode("");
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    );
  }

  // ── Unenroll confirmation ───────────────────────────────────
  if (step === "unenroll-confirm") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-card p-[var(--density-card-padding)]">
          <h2 className="text-base font-semibold text-foreground">
            Remove two-factor authentication?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This will remove your authenticator app and all backup codes. Your
            account will only be protected by your password.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUnenroll}
              disabled={isPending}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isPending ? "Removing..." : "Remove"}
            </button>
            <button
              onClick={() => setStep("status")}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  return null;
}
