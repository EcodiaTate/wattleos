// src/app/(app)/incidents/page.tsx
//
// ============================================================
// WattleOS V2 - Module A: Incident Register (Reg 87)
// ============================================================
// Server Component. Loads the paginated incident register
// and surfaces any serious incidents still awaiting regulatory
// notification (24h countdown alerts).
// ============================================================

import { IncidentRegister } from "@/components/domain/incidents/incident-register";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import {
  listIncidents,
  getOpenSeriousIncidents,
} from "@/lib/actions/incidents";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Incident Register" };

export default async function IncidentsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_INCIDENTS)) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_INCIDENTS);
  const canCreate = hasPermission(context, Permissions.CREATE_INCIDENT);

  const [incidentsResult, seriousResult] = await Promise.all([
    listIncidents({ per_page: 25, page: 1 }),
    getOpenSeriousIncidents(),
  ]);

  const incidents = incidentsResult.data ?? [];
  const total = incidentsResult.pagination.total;
  const seriousOpen = seriousResult.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Incident Register
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Regulation 87 - all incidents, injuries, traumas and illnesses.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/incidents/new"
            className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Log Incident
          </Link>
        )}
      </div>

      {/* Serious incident countdown alerts */}
      {seriousOpen.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--destructive)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--destructive)" }}
            >
              {seriousOpen.length} serious{" "}
              {seriousOpen.length === 1 ? "incident" : "incidents"} awaiting
              regulatory notification
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Regulation 87 requires notification to the regulatory authority
            within 24 hours. Open each incident to record the NQA ITS
            notification.
          </p>
          <div className="space-y-1">
            {seriousOpen.map((incident) => {
              const occurredAt = new Date(incident.occurred_at);
              const deadline = new Date(
                occurredAt.getTime() + 24 * 60 * 60 * 1000,
              );
              const now = new Date();
              const hoursLeft = Math.max(
                0,
                (deadline.getTime() - now.getTime()) / (1000 * 60 * 60),
              );
              const isOverdue = hoursLeft === 0;
              return (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="touch-target flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-white/20"
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {incident.incident_type.replace("_", " ")} -{" "}
                    {incident.location}
                  </span>
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{
                      color: isOverdue
                        ? "var(--destructive)"
                        : "var(--foreground)",
                    }}
                  >
                    {isOverdue ? "OVERDUE" : `${hoursLeft.toFixed(1)}h left`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Register */}
      <IncidentRegister
        incidents={incidents}
        total={total}
        canManage={canManage}
      />
    </div>
  );
}
