// src/app/(app)/admin/staff/page.tsx
//
// ============================================================
// WattleOS V2 - Staff Management: Directory
// ============================================================
// Server Component. Permission-gated to MANAGE_USERS.
// Loads staff roster and available roles, then delegates
// the interactive table + invite sheet to the client.
// ============================================================

import { redirect } from "next/navigation";
import Link from "next/link";

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listStaff } from "@/lib/actions/staff-actions";
import { listRoles } from "@/lib/actions/staff-actions";

import { StaffListClient } from "./staff-list-client";

export const metadata = {
  title: "Staff - WattleOS",
};

export default async function StaffPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_USERS)) {
    redirect("/dashboard");
  }

  const [staffResult, rolesResult] = await Promise.all([
    listStaff(),
    listRoles(),
  ]);

  const staff = staffResult.data ?? [];
  const roles = rolesResult.data ?? [];

  // Quick stats
  const active = staff.filter((s) => s.status === "active").length;
  const invited = staff.filter((s) => s.status === "invited").length;
  const suspended = staff.filter((s) => s.status === "suspended").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff members, roles, and access permissions.
          </p>
        </div>
        <Link
          href="/admin/staff/roles"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Roles &amp; Permissions →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{active}</p>
          <p className="text-xs font-medium text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-info">{invited}</p>
          <p className="text-xs font-medium text-muted-foreground">Invited</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-muted-foreground">{suspended}</p>
          <p className="text-xs font-medium text-muted-foreground">Suspended</p>
        </div>
      </div>

      {/* Interactive list */}
      <StaffListClient
        initialStaff={staff}
        roles={roles}
        currentUserId={context.user.id}
      />
    </div>
  );
}
