// src/app/(app)/admin/volunteers/new/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { VolunteerForm } from "@/components/domain/volunteers/volunteer-form";

export const metadata = { title: "Add Volunteer - WattleOS" };

export default async function NewVolunteerPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.MANAGE_VOLUNTEERS)) {
    redirect("/admin/volunteers");
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
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
        <span style={{ color: "var(--muted-foreground)" }}>Add volunteer</span>
      </nav>

      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
      >
        Add Volunteer
      </h1>

      <div
        style={{
          padding: "1.5rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <VolunteerForm mode="create" />
      </div>
    </div>
  );
}
