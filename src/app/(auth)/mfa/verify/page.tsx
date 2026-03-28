// src/app/(auth)/mfa/verify/page.tsx
//
// ============================================================
// WattleOS V2 - MFA Verification (Login Flow)
// ============================================================
// After OAuth callback, if the user has MFA enrolled, they are
// redirected here to enter their TOTP code before accessing
// the app. Also supports backup code verification.
// ============================================================

import { MfaVerifyClient } from "@/components/domain/auth/mfa-verify-client";

export const metadata = {
  title: "Verify Identity",
};

export default function MfaVerifyPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-xl font-semibold text-foreground">
          Two-factor authentication
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
        <MfaVerifyClient />
      </div>
    </div>
  );
}
