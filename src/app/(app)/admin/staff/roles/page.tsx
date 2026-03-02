// src/app/(app)/admin/staff/roles/page.tsx
//
// ============================================================
// WattleOS V2 - Role Management: List
// ============================================================
// Server Component. Lists all roles (system + custom) with
// member counts and permission counts. Delegates the
// interactive "create role" UI to the client component.
// ============================================================

import { redirect } from "next/navigation";
import Link from "next/link";

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listRoles } from "@/lib/actions/staff-actions";

import { RolesClient } from "./roles-client";

export const metadata = {
  title: "Roles & Permissions - WattleOS",
};

export default async function RolesPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_USERS)) {
    redirect("/dashboard");
  }

  const rolesResult = await listRoles();
  const roles = rolesResult.data ?? [];

  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin/staff" className="hover:text-foreground">
              Staff
            </Link>
            <span>/</span>
            <span className="text-foreground">Roles</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Roles &amp; Permissions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System roles are built-in and cannot be deleted. Create custom roles
            to tailor access for your school.
          </p>
        </div>
      </div>

      <RolesClient
        systemRoles={systemRoles}
        customRoles={customRoles}
      />
    </div>
  );
}
