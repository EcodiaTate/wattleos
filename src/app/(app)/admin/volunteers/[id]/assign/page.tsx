// src/app/(app)/admin/volunteers/[id]/assign/page.tsx

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getVolunteer, listVolunteers } from "@/lib/actions/volunteers";
import { AssignmentForm } from "@/components/domain/volunteers/assignment-form";

export const metadata = { title: "Assign Volunteer - WattleOS" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignVolunteerPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.MANAGE_VOLUNTEERS)) {
    redirect(`/admin/volunteers/${id}`);
  }

  const result = await getVolunteer(id);
  if (result.error || !result.data) notFound();

  const { volunteer } = result.data;

  // Also load full volunteer list for the form (this volunteer pre-selected)
  const allVolsResult = await listVolunteers({ status: "active" });
  const volunteers = allVolsResult.data ?? [];

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
        <Link
          href={`/admin/volunteers/${id}`}
          style={{ color: "var(--primary)", textDecoration: "none" }}
        >
          {volunteer.first_name} {volunteer.last_name}
        </Link>
        <span style={{ color: "var(--muted-foreground)", margin: "0 0.5rem" }}>
          /
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          Assign to event
        </span>
      </nav>

      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
      >
        Assign to Event
      </h1>

      <div
        style={{
          padding: "1.5rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <AssignmentForm volunteers={volunteers} />
      </div>
    </div>
  );
}
