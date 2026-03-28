// src/app/(app)/admin/settings/security/page.tsx
//
// ============================================================
// WattleOS V2 - Admin Security Settings (MFA Policy)
// ============================================================
// Tenant-level MFA policy configuration. Allows Owner/Admin
// to set which roles must have MFA enabled.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { MfaPolicyClient } from "@/components/domain/admin/mfa-policy-client";

export const metadata = { title: "Security Policy - WattleOS" };

export default async function AdminSecuritySettingsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_MFA_POLICY as any)) {
    redirect("/dashboard");
  }

  // Fetch current MFA policy
  const adminClient = createSupabaseAdminClient();
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("require_mfa_for_roles")
    .eq("id", context.tenant.id)
    .single();

  const currentRoles: string[] = tenant?.require_mfa_for_roles ?? [
    "Owner",
    "Administrator",
  ];

  // Fetch available roles for this tenant
  const { data: roles } = await adminClient
    .from("roles")
    .select("name")
    .order("name");

  const availableRoles = (roles ?? []).map((r) => r.name as string);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors"
          >
            Admin
          </Link>
          <span className="text-[var(--breadcrumb-separator)]">/</span>
          <span className="text-foreground font-medium">Security Policy</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Security Policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure multi-factor authentication requirements for your school.
        </p>
      </div>

      <MfaPolicyClient
        currentRoles={currentRoles}
        availableRoles={availableRoles}
      />
    </div>
  );
}
