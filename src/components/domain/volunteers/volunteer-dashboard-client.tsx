"use client";

// src/components/domain/volunteers/volunteer-dashboard-client.tsx

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { updateAssignment, cancelAssignment } from "@/lib/actions/volunteers";
import type { VolunteerAssignmentStatus, VolunteerDashboardData } from "@/types/domain";
import { WwccStatusBadge } from "./wwcc-status-badge";
import { AssignmentStatusBadge } from "./assignment-status-badge";

interface VolunteerDashboardClientProps {
  data: VolunteerDashboardData;
}

const STAT_CARDS = (data: VolunteerDashboardData) => [
  {
    label: "Active volunteers",
    value: data.total_active,
    color: "var(--volunteer-wwcc-current)",
    bg: "var(--volunteer-wwcc-current-bg)",
  },
  {
    label: "WWCC expiring soon",
    value: data.wwcc_expiring_count,
    color: "var(--volunteer-wwcc-expiring-soon)",
    bg: "var(--volunteer-wwcc-expiring-soon-bg)",
  },
  {
    label: "WWCC expired",
    value: data.wwcc_expired_count,
    color: "var(--volunteer-wwcc-expired)",
    bg: "var(--volunteer-wwcc-expired-bg)",
  },
  {
    label: "Upcoming assignments",
    value: data.upcoming_assignments_count,
    color: "var(--volunteer-assignment-invited)",
    bg: "var(--volunteer-assignment-invited-bg)",
  },
];

export function VolunteerDashboardClient({ data }: VolunteerDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();

  async function handleStatusChange(
    assignmentId: string,
    newStatus: VolunteerAssignmentStatus,
  ) {
    haptics.medium();
    const result = await updateAssignment(assignmentId, { status: newStatus, notes: null });
    if (!result.error) {
      haptics.success();
      router.refresh();
    } else {
      haptics.error();
    }
  }

  async function handleCancel(assignmentId: string) {
    if (!confirm("Remove this volunteer assignment?")) return;
    haptics.medium();
    const result = await cancelAssignment(assignmentId);
    if (!result.error) {
      haptics.success();
      router.refresh();
    } else {
      haptics.error();
    }
  }

  const stats = STAT_CARDS(data);

  return (
    <div>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: s.color,
                lineHeight: 1,
                marginBottom: "0.25rem",
              }}
            >
              {s.value}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* WWCC Expiry Alerts */}
        {data.expiry_alerts.length > 0 && (
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>WWCC Alerts</h2>
              <Link
                href="/admin/volunteers?wwcc=expired"
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--primary)",
                  textDecoration: "none",
                }}
              >
                View all
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.expiry_alerts.map((v) => (
                <Link
                  key={v.id}
                  href={`/admin/volunteers/${v.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {v.first_name} {v.last_name}
                  </span>
                  <WwccStatusBadge
                    status={v.wwcc_status}
                    expiryDate={v.wwcc_expiry_date}
                    daysUntilExpiry={v.days_until_expiry}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming assignments */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Upcoming Assignments
            </h2>
            <Link
              href="/admin/volunteers/assignments"
              style={{
                fontSize: "0.8125rem",
                color: "var(--primary)",
                textDecoration: "none",
              }}
            >
              View all
            </Link>
          </div>

          {data.upcoming_assignments.length === 0 ? (
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--muted-foreground)",
                padding: "1.5rem",
                textAlign: "center",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              No upcoming assignments.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.upcoming_assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                        {a.volunteer.first_name} {a.volunteer.last_name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {a.event_name} ·{" "}
                        {new Date(a.event_date).toLocaleDateString("en-AU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Role: {a.role}
                      </p>
                    </div>
                    <AssignmentStatusBadge status={a.status} />
                  </div>

                  {/* Quick actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {a.status === "invited" && (
                      <button
                        onClick={() => handleStatusChange(a.id, "confirmed")}
                        className="active-push touch-target"
                        style={{
                          padding: "2px 10px",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--volunteer-assignment-confirmed)",
                          backgroundColor: "var(--volunteer-assignment-confirmed-bg)",
                          color: "var(--volunteer-assignment-confirmed-fg)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                    )}
                    {(a.status === "invited" || a.status === "confirmed") && (
                      <button
                        onClick={() => handleStatusChange(a.id, "attended")}
                        className="active-push touch-target"
                        style={{
                          padding: "2px 10px",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--volunteer-assignment-attended)",
                          backgroundColor: "var(--volunteer-assignment-attended-bg)",
                          color: "var(--volunteer-assignment-attended-fg)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Mark Attended
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="active-push touch-target"
                      style={{
                        padding: "2px 10px",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                        color: "var(--muted-foreground)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
