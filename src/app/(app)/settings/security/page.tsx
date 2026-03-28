// src/app/(app)/settings/security/page.tsx
//
// ============================================================
// WattleOS V2 - Security Settings (MFA Enrollment)
// ============================================================
// Personal MFA enrollment page. Users can:
//   - View their MFA status (enrolled / not enrolled)
//   - Enroll a TOTP authenticator app
//   - View remaining backup codes
//   - Unenroll MFA (if not required by policy)
// ============================================================

import { getMfaStatus } from "@/lib/actions/mfa";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { MfaEnrollmentClient } from "@/components/domain/auth/mfa-enrollment-client";

export const metadata = {
  title: "Security Settings",
};

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mfa_required?: string }>;
}) {
  const [mfaResult, ctx, params] = await Promise.all([
    getMfaStatus(),
    getTenantContext(),
    searchParams,
  ]);

  const mfaStatus = mfaResult.data ?? {
    enrolled: false,
    required: false,
    factorId: null,
    backupCodesRemaining: 0,
  };

  // When redirected here because MFA is required but not enrolled,
  // auto-open the enrollment flow so the user doesn't have to click
  const autoStartEnroll = params.mfa_required === "1" && !mfaStatus.enrolled;

  return (
    <div className="space-y-[var(--density-section-gap)]">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage two-factor authentication for your account.
        </p>
      </div>

      <MfaEnrollmentClient
        enrolled={mfaStatus.enrolled}
        required={mfaStatus.required}
        factorId={mfaStatus.factorId}
        backupCodesRemaining={mfaStatus.backupCodesRemaining}
        roleName={ctx.role.name}
        autoStartEnroll={autoStartEnroll}
      />
    </div>
  );
}
