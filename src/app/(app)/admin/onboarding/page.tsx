// src/app/(app)/admin/onboarding/page.tsx
//
// ============================================================
// WattleOS V2 - First-Run Setup Wizard
// ============================================================
// Server component gate: checks permission and onboarding
// state, then hands off to the multi-step client wizard.
//
// Guard rules:
//   - No MANAGE_TENANT_SETTINGS → redirect /dashboard
//   - onboarding_completed_at is set → redirect /admin
//   - Otherwise: render wizard with pre-fetched school info + roles
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getOnboardingStatus,
  getTenantRoles,
} from "@/lib/actions/setup/onboarding";
import { OnboardingWizardClient } from "./onboarding-wizard-client";

export const metadata = {
  title: "School Setup | WattleOS",
};

export default async function OnboardingPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/dashboard");
  }

  const [statusResult, rolesResult] = await Promise.all([
    getOnboardingStatus(),
    getTenantRoles(),
  ]);

  if (!statusResult.data) {
    redirect("/dashboard");
  }

  // Already completed - don't let them redo it
  if (statusResult.data.onboarding_completed_at) {
    redirect("/admin");
  }

  return (
    <OnboardingWizardClient
      initialData={statusResult.data}
      roles={rolesResult.data ?? []}
    />
  );
}
