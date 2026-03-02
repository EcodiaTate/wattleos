// src/app/(app)/admin/staff/roles/[roleId]/page.tsx
//
// ============================================================
// WattleOS V2 - Role Editor: Server Page
// ============================================================
// Server Component. Loads the role with full permission list
// and member list. Passes to the interactive editor client.
// System roles are read-only for name/description but admins
// CAN adjust which permissions are assigned (to restrict).
// ============================================================

import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRole } from "@/lib/actions/staff-actions";

import { RoleEditorClient } from "./role-editor-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const result = await getRole(roleId);
  return {
    title: `${result.data?.name ?? "Role"} - Roles - WattleOS`,
  };
}

export default async function RoleEditorPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_USERS)) {
    redirect("/dashboard");
  }

  const roleResult = await getRole(roleId);

  if (!roleResult.data) {
    notFound();
  }

  const role = roleResult.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/staff" className="hover:text-foreground">
          Staff
        </Link>
        <span>/</span>
        <Link href="/admin/staff/roles" className="hover:text-foreground">
          Roles
        </Link>
        <span>/</span>
        <span className="text-foreground">{role.name}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{role.name}</h1>
          {role.is_system && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              System role
            </span>
          )}
        </div>
        {role.description && (
          <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
        )}
        {role.is_system && (
          <p className="mt-2 text-xs text-muted-foreground">
            System roles cannot be renamed or deleted. You can adjust which
            permissions are included to restrict access for your school.
          </p>
        )}
      </div>

      <RoleEditorClient role={role} />
    </div>
  );
}
