// src/app/(app)/admin/volunteers/list/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listVolunteers } from "@/lib/actions/volunteers";
import { VolunteerListClient } from "@/components/domain/volunteers/volunteer-list-client";

export const metadata = { title: "All Volunteers - WattleOS" };

export default async function VolunteerListPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_VOLUNTEERS)) {
    redirect("/dashboard");
  }

  const result = await listVolunteers({});
  const volunteers = result.data ?? [];

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
        <Link
          href="/admin/volunteers"
          style={{ color: "var(--primary)", textDecoration: "none" }}
        >
          Volunteers
        </Link>
        <span style={{ color: "var(--muted-foreground)", margin: "0 0.5rem" }}>
          /
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>All volunteers</span>
      </nav>

      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
      >
        All Volunteers
      </h1>

      <VolunteerListClient initialVolunteers={volunteers} />
    </div>
  );
}
