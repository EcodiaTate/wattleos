// src/app/(app)/admin/data-import/page.tsx
//
// ============================================================
// WattleOS V2 - Data Import & Migration Page
// ============================================================
// WHY server component: Auth gate + data fetch for import
// history. The wizard itself is client-side for file handling.
// Tabs separate the two import flows: CSV (data) and Mass
// Invite (parents/staff onboarding).
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import { getImportHistory } from "@/lib/data-import/actions";
import { ImportWizardClient } from "./import-wizard-client";
import { MassInviteClient } from "./mass-invite-client";

export const metadata = {
  title: "Data Import & Migration | WattleOS",
};

export default async function DataImportPage() {
  const context = await getTenantContext();

  // Permission gate: must have manage_students
  if (!hasPermission(context, Permissions.MANAGE_STUDENTS)) {
    redirect("/dashboard");
  }

  // Pre-fetch import history
  const historyResult = await getImportHistory(10);
  const importHistory = historyResult.data ?? [];

  // Check if user also has invite permissions (for the mass invite tab)
  const canInvite =
    hasPermission(context, Permissions.MANAGE_ENROLLMENT) ||
    hasPermission(context, Permissions.MANAGE_USERS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Data Import & Migration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import data from CSV files or bulk-invite parents and staff to
          WattleOS.
        </p>
      </div>

      <ImportWizardClient importHistory={importHistory} canInvite={canInvite} />
    </div>
  );
}