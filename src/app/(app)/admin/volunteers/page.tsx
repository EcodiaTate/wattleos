// src/app/(app)/admin/volunteers/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getVolunteerDashboard } from "@/lib/actions/volunteers";
import { VolunteerDashboardClient } from "@/components/domain/volunteers/volunteer-dashboard-client";

export const metadata = { title: "Volunteers - WattleOS" };

export default async function VolunteersPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_VOLUNTEERS)) {
    redirect("/dashboard");
  }

  const result = await getVolunteerDashboard();
  const data = result.data ?? {
    total_active: 0,
    wwcc_expiring_count: 0,
    wwcc_expired_count: 0,
    upcoming_assignments_count: 0,
    expiry_alerts: [],
    upcoming_assignments: [],
  };

  const canManage = hasPermission(ctx, Permissions.MANAGE_VOLUNTEERS);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Volunteers
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            WWCC verification, role assignments, and event rostering
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href="/admin/volunteers/assignments"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              fontWeight: 500,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            All assignments
          </Link>
          {canManage && (
            <Link
              href="/admin/volunteers/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              + Add volunteer
            </Link>
          )}
        </div>
      </div>

      <VolunteerDashboardClient data={data} />
    </div>
  );
}
