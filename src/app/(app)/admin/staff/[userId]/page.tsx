// src/app/(app)/admin/staff/[userId]/page.tsx
//
// ============================================================
// WattleOS V2 - Staff Profile Page
// ============================================================
// Server Component. Loads the full staff member detail
// (user, role, profile, compliance records) then passes to
// the interactive client component.
// ============================================================

import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStaffMember, listRoles } from "@/lib/actions/staff-actions";

import { StaffProfileClient } from "./staff-profile-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const result = await getStaffMember(userId);
  const m = result.data;
  if (!m) return { title: "Staff Member - WattleOS" };
  const name =
    m.first_name || m.last_name
      ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
      : m.email;
  return { title: `${name} - Staff - WattleOS` };
}

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_USERS)) {
    redirect("/dashboard");
  }

  const [memberResult, rolesResult] = await Promise.all([
    getStaffMember(userId),
    listRoles(),
  ]);

  if (!memberResult.data) {
    notFound();
  }

  const member = memberResult.data;
  const roles = rolesResult.data ?? [];

  const displayName =
    member.first_name || member.last_name
      ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
      : member.email;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/staff" className="hover:text-foreground">
          Staff
        </Link>
        <span>/</span>
        <span className="text-foreground">{displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {member.first_name && member.last_name
            ? `${member.first_name[0]}${member.last_name[0]}`.toUpperCase()
            : member.email.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">{member.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
              {member.role_name}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                member.status === "active"
                  ? "bg-success/15 text-success"
                  : member.status === "invited"
                    ? "bg-info/15 text-info"
                    : "bg-destructive/15 text-destructive"
              }`}
            >
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Profile client (tabs) */}
      <StaffProfileClient
        member={member}
        roles={roles}
        currentUserId={context.user.id}
      />
    </div>
  );
}
