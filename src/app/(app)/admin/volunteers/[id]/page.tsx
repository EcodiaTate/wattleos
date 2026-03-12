// src/app/(app)/admin/volunteers/[id]/page.tsx

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getVolunteer } from "@/lib/actions/volunteers";
import { WwccStatusBadge } from "@/components/domain/volunteers/wwcc-status-badge";
import { VolunteerStatusBadge } from "@/components/domain/volunteers/volunteer-status-badge";
import { AssignmentStatusBadge } from "@/components/domain/volunteers/assignment-status-badge";

export const metadata = { title: "Volunteer Profile - WattleOS" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VolunteerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_VOLUNTEERS)) {
    redirect("/dashboard");
  }

  const result = await getVolunteer(id);
  if (result.error || !result.data) notFound();

  const { volunteer, assignments } = result.data;
  const canManage = hasPermission(ctx, Permissions.MANAGE_VOLUNTEERS);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    gap: "0.5rem",
    padding: "0.625rem 0",
    borderBottom: "1px solid var(--border)",
    alignItems: "start",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    color: "var(--muted-foreground)",
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "0.9375rem",
    color: "var(--foreground)",
  };

  const upcomingAssignments = assignments.filter((a) =>
    ["invited", "confirmed"].includes(a.status),
  );
  const pastAssignments = assignments.filter((a) =>
    ["attended", "no_show", "declined"].includes(a.status),
  );

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
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
        <span style={{ color: "var(--muted-foreground)" }}>
          {volunteer.first_name} {volunteer.last_name}
        </span>
      </nav>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            {volunteer.first_name} {volunteer.last_name}
          </h1>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <VolunteerStatusBadge status={volunteer.status} />
            <WwccStatusBadge
              status={volunteer.wwcc_status}
              expiryDate={volunteer.wwcc_expiry_date}
              daysUntilExpiry={volunteer.days_until_expiry}
            />
          </div>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href={`/admin/volunteers/${id}/assign`}
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
              Assign to event
            </Link>
            <Link
              href={`/admin/volunteers/${id}/edit`}
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
              Edit
            </Link>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Profile details */}
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
              marginBottom: "0.75rem",
            }}
          >
            Profile
          </h2>

          {volunteer.email && (
            <div style={rowStyle}>
              <span style={labelStyle}>Email</span>
              <a
                href={`mailto:${volunteer.email}`}
                style={{ ...valueStyle, color: "var(--primary)" }}
              >
                {volunteer.email}
              </a>
            </div>
          )}
          {volunteer.phone && (
            <div style={rowStyle}>
              <span style={labelStyle}>Phone</span>
              <a
                href={`tel:${volunteer.phone}`}
                style={{ ...valueStyle, color: "var(--primary)" }}
              >
                {volunteer.phone}
              </a>
            </div>
          )}
          <div style={rowStyle}>
            <span style={labelStyle}>WWCC Number</span>
            <span style={valueStyle}>{volunteer.wwcc_number ?? "-"}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>WWCC Expiry</span>
            <span style={valueStyle}>
              {volunteer.wwcc_expiry_date
                ? new Date(volunteer.wwcc_expiry_date).toLocaleDateString(
                    "en-AU",
                    { day: "numeric", month: "long", year: "numeric" },
                  )
                : "-"}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>WWCC State</span>
            <span style={valueStyle}>{volunteer.wwcc_state ?? "-"}</span>
          </div>
          {volunteer.notes && (
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span style={labelStyle}>Notes</span>
              <span style={{ ...valueStyle, whiteSpace: "pre-wrap" }}>
                {volunteer.notes}
              </span>
            </div>
          )}
        </div>

        {/* Assignments */}
        <div>
          {/* Upcoming */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              Upcoming ({upcomingAssignments.length})
            </h2>
            {upcomingAssignments.length === 0 ? (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--muted-foreground)",
                }}
              >
                No upcoming assignments.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {upcomingAssignments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid var(--border)",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem" }}>
                        {a.event_name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                        }}
                      >
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

          {/* Past */}
          {pastAssignments.length > 0 && (
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
                  marginBottom: "0.75rem",
                }}
              >
                Past ({pastAssignments.length})
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {pastAssignments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid var(--border)",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.9375rem" }}>
                        {a.event_name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {new Date(a.event_date).toLocaleDateString("en-AU", {
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
