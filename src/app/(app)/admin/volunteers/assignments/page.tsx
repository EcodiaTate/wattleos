// src/app/(app)/admin/volunteers/assignments/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listAssignments, listVolunteers } from "@/lib/actions/volunteers";
import { AssignmentStatusBadge } from "@/components/domain/volunteers/assignment-status-badge";
import { WwccStatusBadge } from "@/components/domain/volunteers/wwcc-status-badge";
import { AssignmentForm } from "@/components/domain/volunteers/assignment-form";

export const metadata = { title: "Volunteer Assignments - WattleOS" };

export default async function AssignmentsPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_VOLUNTEERS)) {
    redirect("/dashboard");
  }

  const today = new Date().toISOString().split("T")[0];
  const [assignmentsResult, volunteersResult] = await Promise.all([
    listAssignments({ from_date: today }),
    listVolunteers({ status: "active" }),
  ]);

  const assignments = assignmentsResult.data ?? [];
  const volunteers = volunteersResult.data ?? [];
  const canManage = hasPermission(ctx, Permissions.MANAGE_VOLUNTEERS);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
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
        <span style={{ color: "var(--muted-foreground)" }}>Assignments</span>
      </nav>

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
            Upcoming Assignments
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}{" "}
            from today
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: canManage ? "1fr 360px" : "1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Assignment table */}
        <div>
          {assignments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--muted-foreground)",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.5rem",
                  color: "var(--empty-state-icon)",
                }}
              >
                🙋
              </div>
              <p style={{ fontWeight: 600 }}>No upcoming assignments</p>
              <p style={{ fontSize: "0.875rem" }}>
                Assign a volunteer to an upcoming event to see them here.
              </p>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                backgroundColor: "var(--card)",
              }}
            >
              {assignments.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "1rem",
                    padding: "0.875rem 1rem",
                    borderBottom:
                      i < assignments.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        href={`/admin/volunteers/${a.volunteer.id}`}
                        style={{
                          fontWeight: 600,
                          color: "var(--foreground)",
                          textDecoration: "none",
                          fontSize: "0.9375rem",
                        }}
                      >
                        {a.volunteer.first_name} {a.volunteer.last_name}
                      </Link>
                      <WwccStatusBadge
                        status={a.volunteer.wwcc_status}
                        size="sm"
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--muted-foreground)",
                        marginTop: 2,
                      }}
                    >
                      {a.event_name} ·{" "}
                      {new Date(a.event_date).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {a.role}
                    </p>
                  </div>
                  <AssignmentStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick-add form */}
        {canManage && (
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Assign volunteer
            </h2>
            <AssignmentForm volunteers={volunteers} />
          </div>
        )}
      </div>
    </div>
  );
}
